/**
 * Outbound webhook dispatcher — server-side only.
 * Called from API routes to fan-out events to registered webhook endpoints.
 */

import { createHmac } from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import { WebhookEvent } from '@/types/webhook';
import { FieldValue } from 'firebase-admin/firestore';

const ENDPOINTS_COLLECTION = 'webhookEndpoints';
const DELIVERIES_COLLECTION = 'webhookDeliveries';

/**
 * Dispatch a webhook event to all active endpoints subscribed to it.
 *
 * For each matching endpoint:
 *  - POST JSON payload to the endpoint URL
 *  - Sign with HMAC-SHA256 using the endpoint's secret
 *  - Log delivery result (success / failure) to Firestore
 */
export async function dispatchWebhookEvent(
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const db = getAdminDb();

  // Fetch all active endpoints that subscribe to this event
  const endpointsSnapshot = await db
    .collection(ENDPOINTS_COLLECTION)
    .where('active', '==', true)
    .where('events', 'array-contains', event)
    .get();

  if (endpointsSnapshot.empty) return;

  const timestamp = Date.now().toString();
  const body = JSON.stringify(payload);

  const deliveryPromises = endpointsSnapshot.docs.map(async (endpointDoc) => {
    const endpoint = endpointDoc.data();
    const endpointId = endpointDoc.id;

    // Create HMAC-SHA256 signature
    const signature = createHmac('sha256', endpoint.secret)
      .update(body)
      .digest('hex');

    let status: 'success' | 'failed' = 'failed';
    let responseCode: number | undefined;
    let responseBody: string | undefined;

    try {
      const response = await fetch(endpoint.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': timestamp,
        },
        body,
        signal: AbortSignal.timeout(10_000), // 10 second timeout
      });

      responseCode = response.status;
      responseBody = await response.text().catch(() => undefined);

      // Treat 2xx as success
      if (response.ok) {
        status = 'success';
      }
    } catch (error) {
      responseBody = error instanceof Error ? error.message : 'Unknown error';
    }

    // Log delivery to Firestore
    await db.collection(DELIVERIES_COLLECTION).add({
      endpointId,
      event,
      payload,
      status,
      responseCode: responseCode ?? null,
      responseBody: responseBody ?? null,
      attemptCount: 1,
      lastAttemptAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  // Fire all deliveries in parallel — failures are logged, not thrown
  await Promise.allSettled(deliveryPromises);
}

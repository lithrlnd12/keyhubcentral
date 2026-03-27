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

/** Max response body length stored in Firestore (prevents data exfiltration) */
const MAX_RESPONSE_BODY_LENGTH = 1024;

/**
 * Blocked IP ranges for SSRF protection.
 * Prevents webhook URLs from targeting internal/cloud metadata endpoints.
 */
const BLOCKED_IP_PATTERNS = [
  /^127\./,                // Loopback
  /^10\./,                 // RFC 1918
  /^172\.(1[6-9]|2\d|3[01])\./, // RFC 1918
  /^192\.168\./,           // RFC 1918
  /^169\.254\./,           // Link-local / cloud metadata
  /^0\./,                  // Current network
  /^::1$/,                 // IPv6 loopback
  /^fc00:/i,               // IPv6 private
  /^fe80:/i,               // IPv6 link-local
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'metadata.google.internal',
  'metadata.google',
  '169.254.169.254',
];

/**
 * Validate a webhook URL is safe to fetch from the server.
 * Blocks private IPs, cloud metadata endpoints, and non-HTTPS URLs.
 */
export function isUrlSafeForServerFetch(url: string): { safe: boolean; reason?: string } {
  try {
    const parsed = new URL(url);

    // Must be HTTPS (allow HTTP only for explicit localhost in development)
    if (parsed.protocol !== 'https:') {
      return { safe: false, reason: 'Only HTTPS URLs are allowed for webhook endpoints' };
    }

    // Block known dangerous hostnames
    const hostname = parsed.hostname.toLowerCase();
    if (BLOCKED_HOSTNAMES.includes(hostname)) {
      return { safe: false, reason: `Hostname '${hostname}' is not allowed` };
    }

    // Block private/internal IP ranges
    for (const pattern of BLOCKED_IP_PATTERNS) {
      if (pattern.test(hostname)) {
        return { safe: false, reason: 'Private/internal IP addresses are not allowed' };
      }
    }

    return { safe: true };
  } catch {
    return { safe: false, reason: 'Invalid URL' };
  }
}

/**
 * Dispatch a webhook event to all active endpoints subscribed to it.
 *
 * For each matching endpoint:
 *  - Validate URL is safe (SSRF protection)
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

    // SSRF protection: validate URL before fetching
    const urlCheck = isUrlSafeForServerFetch(endpoint.url);
    if (!urlCheck.safe) {
      await db.collection(DELIVERIES_COLLECTION).add({
        endpointId,
        event,
        payload,
        status: 'failed',
        responseCode: null,
        responseBody: `Blocked: ${urlCheck.reason}`,
        attemptCount: 1,
        lastAttemptAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
      return;
    }

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
      const rawBody = await response.text().catch(() => undefined);
      // Truncate response body to prevent data exfiltration
      responseBody = rawBody ? rawBody.substring(0, MAX_RESPONSE_BODY_LENGTH) : undefined;

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

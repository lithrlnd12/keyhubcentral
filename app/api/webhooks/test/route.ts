import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyFirebaseAuth, isAdmin } from '@/lib/auth/verifyRequest';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/webhooks/test
 * Send a test payload to a specific webhook endpoint.
 * Requires owner or admin role.
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check — owner/admin only
    const authResult = await verifyFirebaseAuth(request);
    if (!authResult.authenticated) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }
    if (!isAdmin(authResult.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { endpointId } = body;

    if (!endpointId) {
      return NextResponse.json(
        { error: 'endpointId is required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const endpointDoc = await db
      .collection('webhookEndpoints')
      .doc(endpointId)
      .get();

    if (!endpointDoc.exists) {
      return NextResponse.json(
        { error: 'Webhook endpoint not found' },
        { status: 404 }
      );
    }

    const endpoint = endpointDoc.data()!;

    // Build test payload
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery from KeyHub Central.',
        endpointId,
      },
    };

    const payloadString = JSON.stringify(testPayload);
    const timestamp = Date.now().toString();

    // Sign with HMAC-SHA256
    const signature = createHmac('sha256', endpoint.secret)
      .update(payloadString)
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
          'X-Webhook-Event': 'test',
          'X-Webhook-Timestamp': timestamp,
        },
        body: payloadString,
        signal: AbortSignal.timeout(10_000),
      });

      responseCode = response.status;
      responseBody = await response.text().catch(() => undefined);

      if (response.ok) {
        status = 'success';
      }
    } catch (error) {
      responseBody = error instanceof Error ? error.message : 'Unknown error';
    }

    // Log delivery
    await db.collection('webhookDeliveries').add({
      endpointId,
      event: 'test',
      payload: testPayload,
      status,
      responseCode: responseCode ?? null,
      responseBody: responseBody ?? null,
      attemptCount: 1,
      lastAttemptAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      status,
      responseCode: responseCode ?? null,
      responseBody: responseBody ?? null,
    });
  } catch (error) {
    console.error('Webhook test error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

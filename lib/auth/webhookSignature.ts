import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verify Facebook webhook signature (X-Hub-Signature-256)
 * Facebook sends HMAC-SHA256 of the raw body using app secret
 */
export function verifyFacebookSignature(
  rawBody: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature || !appSecret) {
    return false;
  }

  // Signature format: sha256=<hex>
  const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
    .update(rawBody)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Verify Vapi webhook signature
 * Vapi uses a secret token that should match the configured webhook secret
 */
export function verifyVapiSignature(
  rawBody: string,
  signature: string | null,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) {
    // If no secret configured, log warning but allow (for backwards compatibility)
    if (!webhookSecret) {
      console.warn('VAPI_WEBHOOK_SECRET not configured - webhook verification disabled');
      return true;
    }
    return false;
  }

  // Vapi signature format may vary - check their docs
  // Common format: HMAC-SHA256 of body
  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Create HMAC signature for OAuth state
 */
export function signState(state: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(state)
    .digest('hex');
}

/**
 * Verify HMAC signature for OAuth state
 */
export function verifyStateSignature(
  state: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = signState(state, secret);

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

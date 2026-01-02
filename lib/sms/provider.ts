// SMS Provider - Abstraction layer for Textbelt (testing) and Twilio (production)

import { SmsSendResult, TextbeltResponse } from './types';

const TEXTBELT_API_URL = 'https://textbelt.com/text';

// Get SMS provider from env (defaults to textbelt for testing)
function getProvider(): 'textbelt' | 'twilio' {
  return (process.env.SMS_PROVIDER as 'textbelt' | 'twilio') || 'textbelt';
}

// Normalize phone number to E.164 format for US numbers
export function normalizePhoneNumber(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, '');

  // 11 digits starting with 1 → +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // 10 digits → +1XXXXXXXXXX (US)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // 7 digits - missing area code
  if (digits.length === 7) {
    throw new Error(`Phone number "${phone}" is missing area code`);
  }

  // Already has + prefix and valid length
  if (cleaned.startsWith('+') && digits.length >= 10) {
    return cleaned.replace(/[^\d+]/g, '');
  }

  throw new Error(`Cannot normalize phone number "${phone}" to E.164 format`);
}

// Send SMS via Textbelt (for testing)
async function sendViaTextbelt(to: string, body: string): Promise<SmsSendResult> {
  const apiKey = process.env.TEXTBELT_API_KEY || 'textbelt'; // 'textbelt' = free tier (1/day)

  try {
    const normalizedPhone = normalizePhoneNumber(to);

    const response = await fetch(TEXTBELT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        phone: normalizedPhone,
        message: body,
        key: apiKey,
      }),
    });

    const data: TextbeltResponse = await response.json();

    console.log('Textbelt response:', data);

    if (data.success) {
      return {
        success: true,
        messageSid: data.textId,
        provider: 'textbelt',
      };
    } else {
      return {
        success: false,
        error: data.error || 'Unknown Textbelt error',
        provider: 'textbelt',
      };
    }
  } catch (error) {
    console.error('Textbelt send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
      provider: 'textbelt',
    };
  }
}

// Send SMS via Twilio (for production)
async function sendViaTwilio(to: string, body: string): Promise<SmsSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error('Twilio credentials not configured (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)');
  }

  try {
    const normalizedPhone = normalizePhoneNumber(to);

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          From: fromNumber,
          Body: body,
        }),
      }
    );

    const data = await response.json();

    console.log('Twilio response:', data);

    if (response.ok && data.sid) {
      return {
        success: true,
        messageSid: data.sid,
        provider: 'twilio',
      };
    } else {
      return {
        success: false,
        error: data.message || 'Unknown Twilio error',
        provider: 'twilio',
      };
    }
  } catch (error) {
    console.error('Twilio send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS',
      provider: 'twilio',
    };
  }
}

// Main send function - routes to configured provider
export async function sendSms(to: string, body: string): Promise<SmsSendResult> {
  const provider = getProvider();

  console.log(`Sending SMS via ${provider} to ${to}`);

  if (provider === 'twilio') {
    return sendViaTwilio(to, body);
  } else {
    return sendViaTextbelt(to, body);
  }
}

// Validate Twilio webhook signature (for production)
export function validateTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string
): boolean {
  // For now, we'll do basic validation
  // In production, use twilio.validateRequest() from the twilio package
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.warn('TWILIO_AUTH_TOKEN not set - skipping signature validation');
    return true;
  }

  // TODO: Implement proper HMAC-SHA1 signature validation
  // For testing, we'll accept all requests if we have an auth token
  return !!signature;
}

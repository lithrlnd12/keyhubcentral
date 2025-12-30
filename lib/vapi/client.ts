// Vapi.ai Client

import { VapiCallRequest, VapiCall, VapiAssistant } from './types';

const VAPI_API_URL = 'https://api.vapi.ai';

// Normalize phone number to E.164 format for US numbers
function normalizePhoneNumber(phone: string): string {
  if (!phone) {
    throw new Error('Phone number is required');
  }

  // Remove all non-digit characters except leading +
  const cleaned = phone.trim();
  const digits = cleaned.replace(/\D/g, '');

  console.log(`Normalizing phone: "${phone}" -> digits: "${digits}" (${digits.length} digits)`);

  // If it's already 11 digits starting with 1, format it
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If it's 10 digits, add +1 prefix (standard US number)
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // If it's 7 digits (local number without area code), we can't process it
  if (digits.length === 7) {
    throw new Error(`Phone number "${phone}" is missing area code`);
  }

  // If it already has a + prefix and looks valid, return as-is
  if (cleaned.startsWith('+') && digits.length >= 10) {
    return cleaned.replace(/[^\d+]/g, '');
  }

  // Can't normalize - throw error instead of passing invalid number
  throw new Error(`Cannot normalize phone number "${phone}" to E.164 format. Got ${digits.length} digits, expected 10 or 11.`);
}

function getApiKey(): string {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    throw new Error('VAPI_API_KEY environment variable is not set');
  }
  return apiKey;
}

function getPhoneNumberId(): string {
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID?.trim();
  if (!phoneNumberId) {
    throw new Error('VAPI_PHONE_NUMBER_ID environment variable is not set');
  }
  console.log(`Vapi: Phone Number ID length: ${phoneNumberId.length}, value: "${phoneNumberId}"`);
  return phoneNumberId;
}

// Default assistant configuration for lead follow-up calls
export function getLeadFollowUpAssistant(customerName: string): VapiAssistant {
  return {
    name: 'Riley - Key Trade Solutions Assistant',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Riley, a friendly and professional assistant from Key Trade Solutions, calling on behalf of Key Renovations. You're following up on a recent inquiry about home renovation services.

About Key Renovations:
- We specialize in cost-effective home and rental property renovations
- We serve homeowners and landlords in the Oklahoma City area
- We offer standardized renovation packages with pre-selected materials to keep costs low and turnaround fast
- Services include: kitchens, bathrooms, flooring, and general home renovations
- We provide FREE quotes and in-home consultations

Your goals:
1. Confirm you're speaking with the right person
2. Thank them for their interest in Key Renovations
3. Ask what type of project they're interested in (kitchen, bathroom, flooring, or other renovation)
4. Ask if this is for their personal home or a rental property
5. Get a brief idea of what they're looking to accomplish
6. Ask about their timeline - when they'd like to get started
7. Confirm their contact information is correct
8. Let them know a renovation specialist will follow up to schedule a FREE in-home consultation and provide a detailed quote

Keep the conversation warm, natural, and friendly. You're from Oklahoma, so be personable! Don't be pushy. If they're not interested or it's a bad time, be respectful and offer to call back later or remove them from the list.

If you reach voicemail, leave a brief message: "Hi ${customerName}, this is Riley calling from Key Renovations. I'm following up on your recent inquiry about our renovation services. We'd love to help with your project and offer you a free quote. Please call us back at 1-877-320-1681, or we'll try reaching you again soon. Have a great day!"

Important: Be concise and conversational. The call should last 2-3 minutes maximum. Don't sound robotic - be warm and genuine.`,
        },
      ],
      temperature: 0.7,
    },
    voice: {
      provider: 'openai',
      voiceId: 'nova', // Warm, friendly female voice
    },
    firstMessage: `Hi, is this ${customerName}?`,
    endCallMessage: `Thank you so much for your time, ${customerName}! One of our renovation specialists will be reaching out soon to schedule your free consultation. Have a wonderful day!`,
    analysisPlan: {
      summaryPrompt: `Summarize this phone call with ${customerName}. Include:
1. The customer's name (${customerName}) at the start
2. What renovation project they're interested in (kitchen, bathroom, flooring, etc.)
3. Whether it's for their personal home or rental property
4. Their timeline for starting the project
5. Any specific details about what they want done
6. Next steps discussed

Keep the summary concise (2-3 sentences) and professional.`,
    },
    endCallPhrases: [
      'goodbye',
      'bye',
      'have a good day',
      'talk to you later',
      'not interested',
      'remove me from the list',
      'take me off your list',
      'stop calling',
    ],
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 300, // 5 minutes max
  };
}

// Create an outbound call
export async function createOutboundCall(
  phoneNumber: string,
  customerName: string,
  metadata?: Record<string, unknown>
): Promise<VapiCall> {
  const apiKey = getApiKey();
  const phoneNumberId = getPhoneNumberId();

  // Normalize phone number to E.164 format
  const normalizedPhone = normalizePhoneNumber(phoneNumber);
  console.log(`Vapi: Calling ${normalizedPhone} (original: ${phoneNumber})`);

  // Use custom assistant ID if set, otherwise use inline assistant
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  const requestBody: VapiCallRequest = {
    phoneNumberId,
    customer: {
      number: normalizedPhone,
      name: customerName,
    },
    // Pass customerName in metadata so Vapi can access it as {{customerName}}
    metadata: {
      ...metadata,
      customerName,
    },
  };

  if (assistantId) {
    requestBody.assistantId = assistantId;
    // Override the first message and end call message with actual customer name
    // This ensures {{customerName}} is replaced even if Vapi's template system fails
    requestBody.assistantOverrides = {
      firstMessage: `Hi, is this ${customerName}?`,
      endCallMessage: `Thank you so much for your time, ${customerName}! One of our renovation specialists will be reaching out soon to schedule your free consultation. Have a wonderful day!`,
      analysisPlan: {
        summaryPrompt: `Summarize this phone call with ${customerName}. Include:
1. The customer's name (${customerName}) at the start
2. What renovation project they're interested in (kitchen, bathroom, flooring, etc.)
3. Whether it's for their personal home or rental property
4. Their timeline for starting the project
5. Any specific details about what they want done
6. Next steps discussed

Keep the summary concise (2-3 sentences) and professional.`,
      },
    };
  } else {
    requestBody.assistant = getLeadFollowUpAssistant(customerName);
  }

  const response = await fetch(`${VAPI_API_URL}/call/phone`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Vapi API error:', error);
    throw new Error(`Failed to create call: ${response.status} ${error}`);
  }

  return response.json();
}

// Get call details
export async function getCall(callId: string): Promise<VapiCall> {
  const apiKey = getApiKey();

  const response = await fetch(`${VAPI_API_URL}/call/${callId}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get call: ${response.status}`);
  }

  return response.json();
}

// List calls
export async function listCalls(limit = 10): Promise<VapiCall[]> {
  const apiKey = getApiKey();

  const response = await fetch(`${VAPI_API_URL}/call?limit=${limit}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list calls: ${response.status}`);
  }

  return response.json();
}

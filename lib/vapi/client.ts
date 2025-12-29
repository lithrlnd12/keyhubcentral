// Vapi.ai Client

import { VapiCallRequest, VapiCall, VapiAssistant } from './types';

const VAPI_API_URL = 'https://api.vapi.ai';

function getApiKey(): string {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) {
    throw new Error('VAPI_API_KEY environment variable is not set');
  }
  return apiKey;
}

function getPhoneNumberId(): string {
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw new Error('VAPI_PHONE_NUMBER_ID environment variable is not set');
  }
  return phoneNumberId;
}

// Default assistant configuration for lead follow-up calls
export function getLeadFollowUpAssistant(customerName: string): VapiAssistant {
  return {
    name: 'Key Renovations Lead Follow-up',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a friendly and professional representative from Key Renovations. You're calling to follow up on a recent inquiry about home renovation services.

Your goals:
1. Confirm you're speaking with the right person
2. Thank them for their interest
3. Ask what type of project they're interested in (kitchen, bathroom, flooring, windows, roofing, etc.)
4. Get a brief description of what they're looking to do
5. Ask about their timeline (when they'd like to start)
6. Confirm their contact information is correct
7. Let them know a specialist will follow up with more details and to schedule an in-home consultation

Keep the conversation natural and friendly. Don't be pushy. If they're not interested or it's a bad time, be respectful and offer to call back later or remove them from the list.

If you reach voicemail, leave a brief message: "Hi, this is calling from Key Renovations regarding your recent inquiry about home renovation services. We'd love to help with your project. Please call us back at your convenience, or we'll try again later. Thank you!"

Important: Be concise. The call should last 2-3 minutes maximum.`,
        },
      ],
      temperature: 0.7,
    },
    voice: {
      provider: 'openai',
      voiceId: 'alloy', // Professional, friendly voice
    },
    firstMessage: `Hi, is this ${customerName}? This is calling from Key Renovations. I'm following up on your recent inquiry about our renovation services. Do you have a quick moment to chat?`,
    endCallMessage: 'Thank you so much for your time! A specialist from our team will be in touch soon. Have a great day!',
    endCallPhrases: [
      'goodbye',
      'bye',
      'have a good day',
      'talk to you later',
      'not interested',
      'remove me from the list',
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

  // Use custom assistant ID if set, otherwise use inline assistant
  const assistantId = process.env.VAPI_ASSISTANT_ID;

  const requestBody: VapiCallRequest = {
    phoneNumberId,
    customer: {
      number: phoneNumber,
      name: customerName,
    },
    metadata,
  };

  if (assistantId) {
    requestBody.assistantId = assistantId;
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

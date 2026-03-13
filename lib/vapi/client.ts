// Vapi.ai Client

import { VapiCallRequest, VapiCall, VapiAssistant } from './types';
import { tenant } from '@/lib/config/tenant';

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
    name: `Riley - ${tenant.entities.kts.label} Assistant`,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Riley, a friendly and professional assistant from ${tenant.entities.kts.label}, calling on behalf of ${tenant.entities.kr.label}. You're following up on a recent inquiry about home renovation services.

About ${tenant.entities.kr.label}:
- We specialize in cost-effective home and rental property renovations
- We serve homeowners and landlords in the ${tenant.serviceArea}
- We offer standardized renovation packages with pre-selected materials to keep costs low and turnaround fast
- Services include: kitchens, bathrooms, flooring, and general home renovations
- We provide FREE quotes and in-home consultations

Your goals:
1. Confirm you're speaking with the right person
2. Thank them for their interest in ${tenant.entities.kr.label}
3. Ask what type of project they're interested in (kitchen, bathroom, flooring, or other renovation)
4. Ask if this is for their personal home or a rental property
5. Get a brief idea of what they're looking to accomplish
6. Ask about their timeline - when they'd like to get started
7. Confirm their contact information is correct
8. Let them know a renovation specialist will follow up to schedule a FREE in-home consultation and provide a detailed quote

Keep the conversation warm, natural, and friendly. Be personable! Don't be pushy. If they're not interested or it's a bad time, be respectful and offer to call back later or remove them from the list.

If you reach voicemail, leave a brief message: "Hi ${customerName}, this is Riley calling from ${tenant.entities.kr.label}. I'm following up on your recent inquiry about our renovation services. We'd love to help with your project and offer you a free quote. Please call us back at ${tenant.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}, or we'll try reaching you again soon. Have a great day!"

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

// Appointment reminder assistant (day-before and morning-of calls)
export function getReminderAssistant(
  customerName: string,
  jobId: string,
  jobType: string,
  scheduledDate: string, // e.g. "Tuesday, March 12th"
  timing: 'day_before' | 'morning_of'
): VapiAssistant {
  const timingPhrase =
    timing === 'day_before'
      ? 'tomorrow'
      : 'today';

  return {
    name: `Riley - Appointment Reminder`,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Riley, a friendly representative from ${tenant.entities.kr.label}. You're calling ${customerName} with a quick appointment reminder.

The customer has a ${jobType} appointment scheduled for ${scheduledDate} — that's ${timingPhrase}.

Your goals:
1. Confirm you're speaking with ${customerName}
2. Give them the friendly reminder about their ${timingPhrase} appointment
3. Ask if they can confirm — say "yes" to confirm, "reschedule" to reschedule, or "cancel" to cancel
4. Call the "confirmAppointment" tool with jobId "${jobId}" and the customer's response: "confirmed", "reschedule", or "cancelled"
5. If confirmed: Let them know the crew will be in touch, wish them a great day
6. If reschedule: Apologize for the inconvenience, let them know someone from the team will call shortly to find a new time
7. If cancelled: Acknowledge their decision, let them know they can always reach us at ${tenant.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}

Keep it brief — this is a quick reminder call, not a sales call. 60–90 seconds maximum.

If you reach voicemail: "Hi ${customerName}, this is Riley from ${tenant.entities.kr.label} with a quick reminder about your ${jobType} appointment ${timingPhrase}. If you need to reschedule or have any questions, please call us at ${tenant.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}. See you ${timingPhrase}!"`,
        },
      ],
      temperature: 0.6,
    },
    voice: {
      provider: 'openai',
      voiceId: 'nova',
    },
    firstMessage: `Hi, is this ${customerName}?`,
    endCallMessage: `Thanks, ${customerName}! We'll see you ${timingPhrase}. Have a great day!`,
    tools: [
      {
        type: 'function',
        function: {
          name: 'confirmAppointment',
          description: 'Record the customer response to the appointment reminder',
          parameters: {
            type: 'object',
            properties: {
              jobId: { type: 'string', description: 'The job ID' },
              response: {
                type: 'string',
                enum: ['confirmed', 'reschedule', 'cancelled'],
                description: 'Customer response to the reminder',
              },
            },
            required: ['jobId', 'response'],
          },
        },
        server: {
          url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/vapi/tools`,
        },
      },
    ],
    endCallPhrases: ['goodbye', 'bye', 'have a good day', 'talk to you later'],
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 180,
  };
}

// Create an outbound appointment reminder call
export async function createAppointmentReminderCall(
  phoneNumber: string,
  customerName: string,
  jobId: string,
  jobType: string,
  scheduledDate: string,
  timing: 'day_before' | 'morning_of'
): Promise<VapiCall> {
  const apiKey = getApiKey();
  const phoneNumberId = getPhoneNumberId();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const requestBody: VapiCallRequest = {
    phoneNumberId,
    customer: {
      number: normalizedPhone,
      name: customerName,
    },
    assistant: getReminderAssistant(customerName, jobId, jobType, scheduledDate, timing),
    metadata: { customerName, jobId, callType: 'appointment_reminder', timing },
  };

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
    console.error('Vapi API error (reminder call):', error);
    throw new Error(`Failed to create reminder call: ${response.status} ${error}`);
  }

  return response.json();
}

// Rating assistant for post-job satisfaction calls
export function getRatingAssistant(customerName: string, jobId: string): VapiAssistant {
  return {
    name: `Riley - Post-Job Rating`,
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are Riley, a friendly representative from ${tenant.entities.kr.label}. You're calling ${customerName} to follow up on their recently completed renovation project.

Your goals:
1. Confirm you're speaking with ${customerName}
2. Thank them for choosing ${tenant.entities.kr.label}
3. Ask how satisfied they are with the work on a scale of 1 to 5 (where 5 is excellent)
4. Listen to any feedback they share — be warm, empathetic, and genuinely interested
5. Call the "recordSatisfaction" tool with the rating, feedback, and jobId "${jobId}"
6. If they gave a 4 or 5: Congratulate them and let them know you'll send a link to leave a Google review
7. If they gave a 1, 2, or 3: Sincerely apologize, let them know a project manager will follow up to make it right, and thank them for their honesty

Keep the call brief (2–3 minutes). Be warm and genuine — never scripted-sounding.

If you reach voicemail, leave a brief message: "Hi ${customerName}, this is Riley from ${tenant.entities.kr.label}. We recently completed a renovation at your home and wanted to check in on how everything turned out. Please call us back at ${tenant.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')} or we'll try again soon. Hope everything looks great!"`,
        },
      ],
      temperature: 0.7,
    },
    voice: {
      provider: 'openai',
      voiceId: 'nova',
    },
    firstMessage: `Hi, is this ${customerName}?`,
    endCallMessage: `Thank you so much, ${customerName}! We really appreciate your feedback and your business. Have a wonderful day!`,
    tools: [
      {
        type: 'function',
        function: {
          name: 'recordSatisfaction',
          description: 'Record the customer satisfaction rating and optional feedback',
          parameters: {
            type: 'object',
            properties: {
              jobId: { type: 'string', description: 'The job ID' },
              rating: { type: 'number', description: 'Rating from 1 to 5' },
              feedback: { type: 'string', description: 'Optional customer comments' },
            },
            required: ['jobId', 'rating'],
          },
        },
        server: {
          url: `${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/vapi/tools`,
        },
      },
    ],
    endCallPhrases: ['goodbye', 'bye', 'have a good day', 'talk to you later', 'not interested'],
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 300,
  };
}

// Create an outbound rating call for a completed job
export async function createRatingCall(
  phoneNumber: string,
  customerName: string,
  jobId: string
): Promise<VapiCall> {
  const apiKey = getApiKey();
  const phoneNumberId = getPhoneNumberId();
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  const requestBody: VapiCallRequest = {
    phoneNumberId,
    customer: {
      number: normalizedPhone,
      name: customerName,
    },
    assistant: getRatingAssistant(customerName, jobId),
    metadata: { customerName, jobId, callType: 'rating' },
  };

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
    console.error('Vapi API error (rating call):', error);
    throw new Error(`Failed to create rating call: ${response.status} ${error}`);
  }

  return response.json();
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

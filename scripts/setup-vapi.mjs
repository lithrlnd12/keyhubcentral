#!/usr/bin/env node
/**
 * VAPI Setup Script — configures assistants, tools, and phone numbers
 * Run: node scripts/setup-vapi.mjs
 */

const API_KEY = process.env.VAPI_API_KEY || 'd575738c-7d45-436e-9c7e-246afd6ffa6e';
const BASE = 'https://api.vapi.ai';
const WEBHOOK_URL = 'https://keyhubcentral.com/api/webhooks/vapi';

// Existing IDs
const INBOUND_ASSISTANT_ID = '02e0edda-450b-4475-ad25-0e8e0b8b8d2a';
const OUTBOUND_ASSISTANT_ID = '958da1cc-0c0d-4a17-9f06-0e6cfbb8fc80';
const KTS_PHONE_ID = '45aeda4f-1c6e-49cf-b914-5a4a00b5b181'; // +18127766215
const KR_PHONE_ID = 'f87f87f5-a4df-48bb-b9b8-db88716c7442';  // +18128009842

async function vapiRequest(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`VAPI ${method} ${path} failed (${res.status}): ${text}`);
  }
  return JSON.parse(text);
}

// Build a VAPI function tool definition
function tool(name, description, properties, required) {
  return {
    type: 'function',
    function: {
      name,
      description,
      parameters: {
        type: 'object',
        properties,
        ...(required?.length ? { required } : {}),
      },
    },
    server: { url: WEBHOOK_URL },
  };
}

// ─── Tool Definitions ─────────────────────────────────────────────

const TOOL_createLeadFromCall = tool(
  'createLeadFromCall',
  'Create a new lead from information gathered during this call. Use after qualifying the caller.',
  {
    callerName: { type: 'string', description: 'Full name of the caller' },
    phone: { type: 'string', description: 'Phone number of the caller' },
    projectType: { type: 'string', description: 'Type of project (kitchen, bathroom, flooring, roofing, windows, siding, etc.)' },
    urgency: { type: 'string', description: 'How urgent: low, medium, or high' },
    city: { type: 'string', description: 'City where the project is located' },
    zip: { type: 'string', description: 'ZIP code' },
    notes: { type: 'string', description: 'Additional details from the call' },
  },
  ['callerName', 'phone', 'projectType']
);

const TOOL_lookupAvailableRep = tool(
  'lookupAvailableRep',
  'Find the best available sales rep based on proximity and rating. Call this to find someone to transfer to.',
  {
    city: { type: 'string', description: 'City of the caller/project' },
    zip: { type: 'string', description: 'ZIP code of the caller/project' },
    projectType: { type: 'string', description: 'Type of project' },
  },
  ['projectType']
);

const TOOL_requestTransfer = tool(
  'requestTransfer',
  'Initiate a warm transfer to a sales rep. Call this after lookupAvailableRep finds someone. Tell the customer you are connecting them before calling this.',
  {
    repUserId: { type: 'string', description: 'The userId of the rep to transfer to (from lookupAvailableRep result)' },
    leadId: { type: 'string', description: 'The lead ID (from createLeadFromCall result)' },
    summary: { type: 'string', description: 'Brief summary for the rep whisper briefing, e.g. "Sarah Chen, kitchen remodel, $15-20K budget, concerned about timeline"' },
  },
  ['repUserId', 'leadId', 'summary']
);

const TOOL_checkAvailability = tool(
  'checkAvailability',
  'Check a rep or contractor availability over a range of days. Use to offer appointment times.',
  {
    userId: { type: 'string', description: 'The userId of the person to check' },
    startDate: { type: 'string', description: 'Start date in YYYY-MM-DD format' },
    daysToCheck: { type: 'number', description: 'Number of days to check (default 7)' },
  },
  ['userId', 'startDate']
);

const TOOL_bookAppointment = tool(
  'bookAppointment',
  'Book an appointment on the in-app calendar. Sets the time block to busy and creates an appointment record.',
  {
    userId: { type: 'string', description: 'The userId of the rep/contractor' },
    date: { type: 'string', description: 'Date in YYYY-MM-DD format' },
    timeBlock: { type: 'string', enum: ['am', 'pm', 'evening'], description: 'Time block: am (6AM-12PM), pm (12PM-6PM), or evening (6PM-10PM)' },
    customerName: { type: 'string', description: 'Customer name' },
    customerPhone: { type: 'string', description: 'Customer phone number' },
    leadId: { type: 'string', description: 'Lead ID to link the appointment to' },
    description: { type: 'string', description: 'Appointment description/notes' },
  },
  ['userId', 'date', 'timeBlock', 'customerName', 'customerPhone']
);

const TOOL_routeToEntity = tool(
  'routeToEntity',
  'Route the caller to the correct business entity. Use when you determine the caller needs KR (renovation), KTS (service/repair), or KD (marketing inquiry).',
  {
    entity: { type: 'string', enum: ['kr', 'kts', 'kd'], description: 'Which entity: kr=renovation, kts=service/repair, kd=marketing' },
    callerName: { type: 'string', description: 'Caller name' },
    phone: { type: 'string', description: 'Caller phone' },
    details: { type: 'string', description: 'Summary of what the caller needs' },
    projectType: { type: 'string', description: 'Project type if applicable' },
    urgency: { type: 'string', description: 'Urgency level' },
  },
  ['entity', 'callerName', 'phone', 'details']
);

const TOOL_identifyCaller = tool(
  'identifyCaller',
  'Identify who is calling by their phone number. Returns caller type (contractor, partner, subscriber, lead, or unknown) and their active jobs if a contractor.',
  {},
  []
);

const TOOL_lookupPartnerInfo = tool(
  'lookupPartnerInfo',
  'Look up partner information by phone number.',
  { phone: { type: 'string', description: 'Phone number to look up (optional, defaults to caller phone)' } },
  []
);

const TOOL_createPartnerServiceTicket = tool(
  'createPartnerServiceTicket',
  'Create a service ticket for a partner reporting an issue.',
  {
    partnerId: { type: 'string', description: 'Partner ID' },
    propertyAddress: { type: 'string', description: 'Property address with the issue' },
    issueType: { type: 'string', description: 'Type of issue (plumbing, electrical, hvac, roofing, general, etc.)' },
    description: { type: 'string', description: 'Description of the issue' },
    urgency: { type: 'string', enum: ['low', 'medium', 'high', 'emergency'], description: 'Urgency level' },
  },
  ['partnerId', 'propertyAddress', 'issueType', 'description', 'urgency']
);

const TOOL_getJobDetails = tool(
  'getJobDetails',
  'Get details about a specific job including customer info, status, and sales rep.',
  { jobId: { type: 'string', description: 'The job ID' } },
  ['jobId']
);

const TOOL_acceptJob = tool(
  'acceptJob',
  'Accept the job assignment. Call this when the contractor says yes.',
  {},
  []
);

const TOOL_declineJob = tool(
  'declineJob',
  'Decline the job assignment. Call this when the contractor says no or is unavailable.',
  { reason: { type: 'string', description: 'Reason for declining (optional)' } },
  []
);

const TOOL_lookupJob = tool(
  'lookupJob',
  'Look up a job by job number or address. Optionally filter to a specific contractor.',
  {
    searchTerm: { type: 'string', description: 'Job number or part of the address' },
    contractorId: { type: 'string', description: 'Contractor ID to filter jobs for' },
  },
  ['searchTerm']
);

const TOOL_updateJobStatus = tool(
  'updateJobStatus',
  'Update the status of a job. Contractors can only change started to complete.',
  {
    jobId: { type: 'string', description: 'The job ID' },
    newStatus: { type: 'string', description: 'New status (e.g. "complete")' },
    note: { type: 'string', description: 'Optional note about the status change' },
  },
  ['jobId', 'newStatus']
);

const TOOL_addJobNote = tool(
  'addJobNote',
  'Add a voice note to a job.',
  {
    jobId: { type: 'string', description: 'The job ID' },
    note: { type: 'string', description: 'The note content' },
  },
  ['jobId', 'note']
);

const TOOL_flagScopeChange = tool(
  'flagScopeChange',
  'Flag a scope change on a job. This notifies the project manager.',
  {
    jobId: { type: 'string', description: 'The job ID' },
    description: { type: 'string', description: 'Description of the scope change' },
    estimatedImpact: { type: 'string', description: 'Estimated cost/time impact' },
  },
  ['jobId', 'description']
);

const TOOL_recordSatisfaction = tool(
  'recordSatisfaction',
  'Record customer satisfaction rating after job completion.',
  {
    jobId: { type: 'string', description: 'The job ID' },
    rating: { type: 'number', description: 'Rating from 1 to 5' },
    feedback: { type: 'string', description: 'Optional customer feedback' },
  },
  ['jobId', 'rating']
);

const TOOL_createServiceTicketFromCall = tool(
  'createServiceTicketFromCall',
  'Create a service ticket when customer reports an issue during verification call.',
  {
    jobId: { type: 'string', description: 'The job ID' },
    issue: { type: 'string', description: 'Description of the issue' },
    urgency: { type: 'string', enum: ['low', 'medium', 'high', 'emergency'], description: 'Urgency level' },
  },
  ['jobId', 'issue', 'urgency']
);

const TOOL_confirmCompletion = tool(
  'confirmCompletion',
  'Confirm that the customer is satisfied and the job is complete.',
  { jobId: { type: 'string', description: 'The job ID' } },
  ['jobId']
);

const TOOL_checkDocumentStatus = tool(
  'checkDocumentStatus',
  'Check if a contractor has uploaded a specific document (insurance, license, w9).',
  {
    contractorId: { type: 'string', description: 'The contractor ID' },
    docType: { type: 'string', enum: ['insurance', 'license', 'w9'], description: 'Document type to check' },
  },
  ['contractorId', 'docType']
);

const TOOL_sendUploadLink = tool(
  'sendUploadLink',
  'Send the contractor a text message with a link to upload their document.',
  {
    contractorId: { type: 'string', description: 'The contractor ID' },
    docType: { type: 'string', description: 'Document type (insurance, license, w9)' },
  },
  ['contractorId', 'docType']
);


// transferCall is a VAPI default tool type (not a custom function tool)
const TOOL_transferCall = {
  type: 'transferCall',
  destinations: [],  // empty = dynamic, server handles via transfer-destination-request webhook
};

// ─── Main Setup ───────────────────────────────────────────────────

async function main() {
  console.log('🔧 Setting up VAPI assistants and phone numbers...\n');

  // ─── 1. Update Inbound Assistant ───
  console.log('1. Updating inbound assistant (02e0edda) with tools + transfer...');
  await vapiRequest('PATCH', `/assistant/${INBOUND_ASSISTANT_ID}`, {
    name: 'Riley - Inbound Receptionist',
    serverUrl: WEBHOOK_URL,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Riley, a friendly receptionist for Key Renovations and Key Trade Solutions. A customer, contractor, or partner may be calling.

STEP 1 — IDENTIFY THE CALLER:
First, call the identifyCaller tool to check if this caller is already in our system.

- If they are a PARTNER: greet them by name, ask about their issue, use lookupPartnerInfo for details, and createPartnerServiceTicket to log their request.
- If they are a CONTRACTOR: greet them and ask what they need. They may want to update a job, report a scope change, or check their schedule.
- If they are a KNOWN LEAD or UNKNOWN: proceed to qualification below.

STEP 2 — TRIAGE (for new callers / leads):
Determine what they need:
- Home renovation project → Route to KR (Key Renovations)
- Service or repair request → Route to KTS (Key Trade Solutions)
- Marketing or advertising inquiry → Route to KD (Keynote Digital)

Call routeToEntity once you know which entity.

STEP 3 — QUALIFY & CREATE LEAD (for renovation inquiries):
1. Get their name
2. Ask what type of project (kitchen, bathroom, flooring, roofing, windows, siding, etc.)
3. Ask about their timeline
4. Ask about their main concern (price, timeline, warranty, or trust)
5. Call createLeadFromCall to save the lead

STEP 4 — TRANSFER OR SCHEDULE:
After creating the lead:
1. Call lookupAvailableRep to find the best sales rep
2. If a rep is available: tell the customer "Let me connect you with a specialist who can help" → call requestTransfer to prepare the transfer data, then use the transferCall tool to initiate the actual transfer
3. If no rep is available: offer to schedule a consultation → call checkAvailability, then bookAppointment
4. If neither works: assure them someone will call back shortly

Keep the conversation warm, friendly, and natural. You're from Oklahoma — be personable! Be concise. Don't be robotic.`,
        },
      ],
      tools: [
        TOOL_identifyCaller,
        TOOL_createLeadFromCall,
        TOOL_lookupAvailableRep,
        TOOL_requestTransfer,
        TOOL_checkAvailability,
        TOOL_bookAppointment,
        TOOL_routeToEntity,
        TOOL_lookupPartnerInfo,
        TOOL_createPartnerServiceTicket,
        TOOL_transferCall,
      ],
    },
  });
  console.log('   ✓ Inbound assistant updated\n');

  // ─── 2. Update Outbound Assistant (Riley) ───
  console.log('2. Updating outbound assistant (958da1cc) with scheduling tools...');
  await vapiRequest('PATCH', `/assistant/${OUTBOUND_ASSISTANT_ID}`, {
    name: 'Riley - Outbound Follow-Up',
    serverUrl: WEBHOOK_URL,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Riley, a friendly and professional assistant from Key Trade Solutions, calling on behalf of Key Renovations. You're following up on a recent inquiry about home renovation services.

About Key Renovations:
- We specialize in cost-effective home and rental property renovations
- We serve homeowners and landlords in the Oklahoma City Metro Area
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
7. Offer to schedule a FREE in-home consultation right now — use checkAvailability to find open slots, then bookAppointment to book it
8. If they don't want to schedule now, let them know a renovation specialist will follow up

Keep the conversation warm, natural, and friendly. You're from Oklahoma, so be personable! Don't be pushy. If they're not interested or it's a bad time, be respectful and offer to call back later or remove them from the list.

Important: Be concise and conversational. The call should last 2-3 minutes maximum.`,
        },
      ],
      tools: [
        TOOL_checkAvailability,
        TOOL_bookAppointment,
        TOOL_getJobDetails,
      ],
    },
  });
  console.log('   ✓ Outbound assistant updated\n');

  // ─── 3. Create Dispatch Assistant ───
  console.log('3. Creating dispatch assistant...');
  const dispatchAssistant = await vapiRequest('POST', '/assistant', {
    name: 'Riley - Dispatch Calldown',
    serverUrl: WEBHOOK_URL,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Riley from Key Trade Solutions. You are calling a contractor to offer them a job assignment.

Present the job details clearly and ask if they are available and want to take the job.

If they say YES or accept: call the acceptJob tool immediately.
If they say NO, decline, or are unavailable: call the declineJob tool with their reason.

Be friendly, professional, and concise. This should be a quick call — under 1 minute.
Do NOT leave voicemail. If you reach voicemail, end the call.`,
        },
      ],
      tools: [
        TOOL_acceptJob,
        TOOL_declineJob,
      ],
    },
    voice: {
      provider: 'vapi',
      voiceId: 'Elliot',
    },
    firstMessage: 'Hi {{customerName}}, this is Riley from Key Trade Solutions. I have a job opportunity for you — do you have a quick minute?',
    silenceTimeoutSeconds: 15,
    maxDurationSeconds: 120,
  });
  console.log(`   ✓ Dispatch assistant created: ${dispatchAssistant.id}`);
  console.log(`   → Set VAPI_DISPATCH_ASSISTANT_ID=${dispatchAssistant.id}\n`);

  // ─── 4. Create Field Update Assistant ───
  console.log('4. Creating field update assistant...');
  const fieldAssistant = await vapiRequest('POST', '/assistant', {
    name: 'Riley - Field Updates',
    serverUrl: WEBHOOK_URL,
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Riley, an assistant for Key Trade Solutions contractors calling in from the field.

STEP 1: Call identifyCaller to identify who is calling and get their active jobs.

STEP 2: If they are a contractor, ask which job they're calling about. If they only have one active job, confirm it. If multiple, ask them to specify by address or job number. Use lookupJob if needed.

STEP 3: Ask what they need to do:
- Update job status (e.g. "job is complete") → use updateJobStatus
- Add a note (e.g. progress update, issue encountered) → use addJobNote
- Flag a scope change (e.g. "found water damage behind the wall") → use flagScopeChange

You can handle multiple updates in one call. After each update, ask "Is there anything else?"

If the caller is NOT a contractor, politely let them know this line is for contractor field updates, and suggest they call the main number at 812-776-6215.

Be friendly and efficient — contractors are calling from job sites and need quick help.`,
        },
      ],
      tools: [
        TOOL_identifyCaller,
        TOOL_lookupJob,
        TOOL_updateJobStatus,
        TOOL_addJobNote,
        TOOL_flagScopeChange,
        TOOL_checkAvailability,
      ],
    },
    voice: {
      provider: 'vapi',
      voiceId: 'Elliot',
    },
    firstMessage: 'Hey! This is Riley from Key Trade Solutions. Who am I speaking with?',
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 300,
  });
  console.log(`   ✓ Field update assistant created: ${fieldAssistant.id}\n`);

  // ─── 5. Wire KR Phone Number to Field Update Assistant ───
  console.log('5. Wiring KR phone (+18128009842) to field update assistant...');
  await vapiRequest('PATCH', `/phone-number/${KR_PHONE_ID}`, {
    assistantId: fieldAssistant.id,
  });
  console.log('   ✓ KR phone number wired\n');

  // ─── Summary ───
  console.log('═══════════════════════════════════════════════════════');
  console.log('SETUP COMPLETE');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Assistants:');
  console.log(`  Inbound (KTS):    ${INBOUND_ASSISTANT_ID} — 9 tools + transfer`);
  console.log(`  Outbound (Riley): ${OUTBOUND_ASSISTANT_ID} — 3 tools`);
  console.log(`  Dispatch (NEW):   ${dispatchAssistant.id} — 2 tools`);
  console.log(`  Field Update:     ${fieldAssistant.id} — 6 tools`);
  console.log('');
  console.log('Phone Numbers:');
  console.log(`  +18127766215 (KTS) → Inbound Receptionist`);
  console.log(`  +18128009842 (KR)  → Field Updates`);
  console.log('');
  console.log('⚠️  Add these environment variables to Vercel:');
  console.log(`  VAPI_DISPATCH_ASSISTANT_ID=${dispatchAssistant.id}`);
  console.log(`  VAPI_FIELD_ASSISTANT_ID=${fieldAssistant.id}`);
  console.log(`  FALLBACK_TRANSFER_NUMBER=+18128906303`);
  console.log('');
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});

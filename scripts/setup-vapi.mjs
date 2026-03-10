#!/usr/bin/env node
/**
 * VAPI Setup Script — configures assistants, tools, and phone numbers
 * Run: node scripts/setup-vapi.mjs
 */

const API_KEY = process.env.VAPI_API_KEY || 'd575738c-7d45-436e-9c7e-246afd6ffa6e';
const BASE = 'https://api.vapi.ai';
const WEBHOOK_URL = 'https://keyhubcentral.com/api/webhooks/vapi';

// Existing IDs — all assistants use PATCH (update), never POST (create)
const INBOUND_ASSISTANT_ID = '02e0edda-450b-4475-ad25-0e8e0b8b8d2a';
const OUTBOUND_ASSISTANT_ID = '958da1cc-0c0d-4a17-9f06-0e6cfbb8fc80';
const DISPATCH_ASSISTANT_ID = '788dc390-d08c-405f-a8f3-a24f091a962b';
const FIELD_ASSISTANT_ID = '91301d51-6d77-44f4-8f60-fc4e7fc8856d';
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

const TOOL_getCurrentDateTime = tool(
  'getCurrentDateTime',
  'Get the current date and time. Call this FIRST before scheduling or discussing dates so you always use the correct date.',
  {},
  []
);

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

const TOOL_lookupTeamMember = tool(
  'lookupTeamMember',
  'Search for a team member by name. Returns their phone number and role. Use when a caller asks to speak with a specific person.',
  {
    name: { type: 'string', description: 'The name (or partial name) of the team member to find' },
  },
  ['name']
);

const TOOL_requestTransfer = tool(
  'requestTransfer',
  'Save transfer routing data for a rep or team member. After this tool returns success, you MUST immediately call the transferCall tool to actually connect the call. Without calling transferCall, the call will go silent.',
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


// transferCall tool — NO static destinations. This forces VAPI to send
// transfer-destination-request to our webhook, which returns the actual
// phone number (rep, team member, or fallback) with a warm handoff whisper.
// The AI MUST still call this tool after requestTransfer — the server handles routing.
const TOOL_transferCall = {
  type: 'transferCall',
  messages: [
    {
      type: 'request-start',
      content: 'Let me connect you now. One moment please.',
    },
  ],
  destinations: [],
};

// ─── Main Setup ───────────────────────────────────────────────────

async function main() {
  console.log('🔧 Setting up VAPI assistants and phone numbers...\n');

  // ─── 1. Update Inbound Assistant ───
  console.log('1. Updating inbound assistant (02e0edda) with tools + transfer...');
  await vapiRequest('PATCH', `/assistant/${INBOUND_ASSISTANT_ID}`, {
    name: 'Riley - Inbound Receptionist',
    serverUrl: WEBHOOK_URL,
    serverMessages: [
      'tool-calls',
      'status-update',
      'end-of-call-report',
      'transfer-destination-request',
    ],
    model: {
      provider: 'openai',
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Riley, a friendly receptionist for Key Renovations and Key Trade Solutions. A customer, contractor, or partner may be calling.

CRITICAL RULES:
- You do NOT know the current date. Before scheduling or discussing ANY dates, ALWAYS call getCurrentDateTime first. Never guess or use old dates.
- When a caller says a day name like "next Thursday" or "this Wednesday," call getCurrentDateTime, calculate the actual date, and CONFIRM it back: "That would be Thursday the 19th, does that sound right?" Always confirm date + day together so there's no confusion.
- Time blocks: Morning (6AM-12PM), Afternoon (12PM-6PM), Evening (6PM-10PM). When the caller says a general time like "morning" or "around 2," map it to the correct block.

STEP 1 — IDENTIFY THE CALLER:
Call identifyCaller to check if this caller is in our system.

- PARTNER: greet by name, ask about their issue, use lookupPartnerInfo, then createPartnerServiceTicket.
- CONTRACTOR: greet them, ask what they need (job update, scope change, schedule).
- KNOWN LEAD or UNKNOWN: proceed to Step 2.

STEP 2 — TRIAGE (new callers / leads):
Determine what they need:
- Home renovation project → KR (Key Renovations)
- Service or repair → KTS (Key Trade Solutions)
- Marketing/advertising inquiry → KD (Keynote Digital)

Call routeToEntity once you know the entity.

STEP 3 — QUALIFY & CREATE LEAD (renovation inquiries):
Ask these questions conversationally, not like a checklist:
1. Their name
2. What type of project (kitchen, bathroom, flooring, roofing, windows, siding, etc.)
3. Where the project is (city/zip)
4. Their timeline — when they'd like to get started
5. Their biggest concern or priority (budget, timeline, quality, trust)

Once you have enough info, call createLeadFromCall to save the lead.

STEP 4 — OFFER CHOICE: TRANSFER OR SCHEDULE:
After creating the lead, call lookupAvailableRep to find the closest available sales rep.

Then ask the caller: "I found [rep name] who specializes in your area. Would you like me to connect you with them right now, or would you prefer to schedule a consultation for a time that works better for you?"

PATH A — TRANSFER NOW:
1. Call requestTransfer with the rep's userId, leadId, and a summary
2. Tell the caller "Let me connect you with [rep name] now, one moment"
3. IMMEDIATELY call the transferCall tool — this is REQUIRED. Without it the call goes silent and hangs up. The server handles routing dynamically.

PATH B — SCHEDULE A CONSULTATION:
1. Call getCurrentDateTime to get today's date
2. Ask the caller: "What days work best for you?" or "Do you have a preference for this week or next?"
3. When they give you a day (e.g. "Tuesday" or "next Friday"):
   - Calculate the actual date from today's date
   - Confirm: "That would be [Day] the [date], right?"
   - Ask: "Do you prefer morning, afternoon, or evening?"
4. Call checkAvailability with the rep's userId and that date (startDate=YYYY-MM-DD, daysToCheck=3)
5. Check the result:
   - If their preferred time block is available: confirm and book it
   - If NOT available: look at the results and suggest the CLOSEST available slot. Say something like: "It looks like [day/time] isn't available, but I do have [next closest day] in the [time block]. Would that work, or would you like to look at a different day?"
   - If nothing is close: expand the search — call checkAvailability again with a later startDate or more days
6. Once the caller confirms a date and time, call bookAppointment with the rep's userId, date, timeBlock, customerName, customerPhone, leadId, and a description
7. Confirm the booking: "You're all set! I've booked you for [Day, Date] in the [time block] with [rep name]. They'll give you a call to confirm the details."

If neither transfer nor scheduling works: assure them someone will call back shortly.

DIRECT TRANSFER BY NAME:
If the caller asks to speak with a specific person (e.g. "Can I talk to John?"):
1. Call lookupTeamMember to find that person
2. If found, call requestTransfer with their userId and a summary
3. Tell the caller "Let me connect you now"
4. IMMEDIATELY call the transferCall tool — REQUIRED or the call will go silent.

Keep the conversation warm, friendly, and natural. You're from Oklahoma — be personable! Be concise. Don't be robotic. Never read off a list of every available slot — just offer the most relevant options based on what the caller asked for.`,
        },
      ],
      tools: [
        TOOL_getCurrentDateTime,
        TOOL_identifyCaller,
        TOOL_createLeadFromCall,
        TOOL_lookupAvailableRep,
        TOOL_lookupTeamMember,
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

CRITICAL: You do NOT know the current date. Before discussing ANY dates, ALWAYS call getCurrentDateTime first. When the caller says a day name like "Thursday" or "next week," calculate the actual date and confirm: "That would be Thursday the 19th, does that sound right?"

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
7. Offer to schedule a FREE in-home consultation

SCHEDULING FLOW:
- Ask: "What days work best for you?"
- When they give a day, call getCurrentDateTime, calculate the date, and confirm: "That would be [Day] the [date], right?"
- Ask: "Morning, afternoon, or evening?"
- Call checkAvailability for that rep and date (daysToCheck=3)
- If their preferred slot is open, book it with bookAppointment
- If NOT open, suggest the closest available: "That time isn't available, but I have [closest option]. Would that work, or would you like to try another day?"
- Confirm the booking with day, date, and time block

If they don't want to schedule now, let them know a renovation specialist will follow up.

Keep the conversation warm, natural, and friendly. You're from Oklahoma, so be personable! Don't be pushy. If they're not interested or it's a bad time, be respectful and offer to call back later or remove them from the list.

Be concise and conversational. The call should last 2-3 minutes maximum. Never dump a list of every available slot — just offer what's relevant to what they asked for.`,
        },
      ],
      tools: [
        TOOL_getCurrentDateTime,
        TOOL_checkAvailability,
        TOOL_bookAppointment,
        TOOL_getJobDetails,
      ],
    },
  });
  console.log('   ✓ Outbound assistant updated\n');

  // ─── 3. Update Dispatch Assistant ───
  console.log('3. Updating dispatch assistant...');
  await vapiRequest('PATCH', `/assistant/${DISPATCH_ASSISTANT_ID}`, {
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
  console.log(`   ✓ Dispatch assistant updated: ${DISPATCH_ASSISTANT_ID}\n`);

  // ─── 4. Update Field Update Assistant ───
  console.log('4. Updating field update assistant...');
  await vapiRequest('PATCH', `/assistant/${FIELD_ASSISTANT_ID}`, {
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
  console.log(`   ✓ Field update assistant updated: ${FIELD_ASSISTANT_ID}\n`);

  // ─── 5. Wire KR Phone Number to Field Update Assistant ───
  console.log('5. Wiring KR phone (+18128009842) to field update assistant...');
  await vapiRequest('PATCH', `/phone-number/${KR_PHONE_ID}`, {
    assistantId: FIELD_ASSISTANT_ID,
  });
  console.log('   ✓ KR phone number wired\n');

  // ─── Summary ───
  console.log('═══════════════════════════════════════════════════════');
  console.log('SETUP COMPLETE — all assistants updated (no new IDs)');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Assistants:');
  console.log(`  Inbound (KTS):    ${INBOUND_ASSISTANT_ID} — 9 tools + transfer`);
  console.log(`  Outbound (Riley): ${OUTBOUND_ASSISTANT_ID} — 3 tools`);
  console.log(`  Dispatch:         ${DISPATCH_ASSISTANT_ID} — 2 tools`);
  console.log(`  Field Update:     ${FIELD_ASSISTANT_ID} — 6 tools`);
  console.log('');
  console.log('Phone Numbers:');
  console.log(`  +18127766215 (KTS) → Inbound Receptionist`);
  console.log(`  +18128009842 (KR)  → Field Updates`);
  console.log('');
}

main().catch((err) => {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
});

# Voice AI — Feature Tracker

> Last updated: 2026-03-11
> Scope: All three business units — KD (Keynote Digital), KTS (Key Trade Solutions), KR (Key Renovations)

Ratings: **Impact** (🔴 High / 🟡 Mid / 🟢 Low) · **Build Speed** (⚡ Quick / 🕐 Timely)

---

## ✅ Built

### OUT-01 · Speed-to-Lead (Sub-60 Second Response)
**Module:** KD · **Impact:** 🔴 High · **Speed:** 🕐 Timely

When a new lead is created from any source (Angi, Google LSA, Thumbtack, form submission), AI places an outbound call within 60 seconds. Introduces Key Renovations, asks qualifying questions, and attempts to book an in-home estimate.

- Trigger: Capture form submission → `/api/voice/call-lead`
- Output: Vapi outbound call placed immediately; lead updated with `lastCallAt`, `callAttempts`; call logged to `voiceCalls`
- Fallback: SMS follow-up if no answer after 2 attempts

---

### OUT-03 · Post-Job Rating Collection
**Module:** KR · **Impact:** 🔴 High · **Speed:** ⚡ Quick

24 hours after a job reaches `complete` status, AI calls the customer. Collects a 1–5 star rating and verbal feedback. Logs to `ratingRequests` in Firestore. Happy customers (4–5) are prompted to leave a Google review.

- Trigger: Job status → `complete` → sets `ratingCallScheduledAt = now + 24h`
- Cron: `/api/voice/rating-call` every 4 hours
- Tool: `recordSatisfaction` → writes `ratingRequests` doc; sets `pmReviewRequired = true` if rating ≤ 3
- If rating < 4: Flags job for PM review; does NOT ask for public review

---

### OUT-05 · Appointment Confirmations
**Module:** KR · **Impact:** 🟡 Mid · **Speed:** ⚡ Quick

Day-before and morning-of reminder calls for scheduled jobs. Customer can confirm, reschedule, or cancel via voice response. Job record updated automatically. PM flagged on reschedule/cancel.

- Trigger: Job status → `scheduled` → sets `reminderDayBeforeSent: false`, `reminderMorningOfSent: false`
- Cron: `/api/voice/appointment-reminder` every hour
- Windows: Day-before (20–28h out), Morning-of (1–4h out)
- Tool: `confirmAppointment` → writes response; sets `pmActionRequired` on reschedule/cancel

---

---

## 🔲 Next Up — High Priority

### IN-02 · Emergency Job Line
**Module:** KR / KTS · **Impact:** 🔴 High · **Speed:** ⚡ Quick

After-hours and weekend calls handled by AI. Classifies as emergency or non-emergency. Emergency jobs auto-page the on-call PM via SMS and create a job record with status `lead`.

- Trigger: After-hours inbound call to KR main line
- Output: Job created, PM notified, customer receives callback ETA via SMS
- Escalation: Always escalates emergency calls to on-call PM

---

### OUT-07 · Contractor Job Dispatch
**Module:** KTS · **Impact:** 🔴 High · **Speed:** ⚡ Quick

When a contractor is matched to a job, AI calls them with the full job brief — customer name, address, job type, scheduled date/time. Contractor says "accept" or "decline." Job crew record is updated in real time. If declined, next recommended contractor is called.

> **Differentiator:** Closes the Uber-style dispatch loop. Contractor doesn't need the app open to receive and accept jobs.

- Trigger: Contractor added to `crewIds` on a job
- Output: Acceptance logged to job; if declined, next recommended contractor is called

---

### OUT-02 · Estimate Follow-Up
**Module:** KR · **Impact:** 🔴 High · **Speed:** ⚡ Quick

Lead received a quote but hasn't responded in 48 hours. AI calls to check in, answer common objections, and attempt to close or schedule a follow-up with a sales rep.

- Trigger: Job in `lead` status, no activity for 48hrs
- Output: Call outcome logged; rep alerted if objection is price-related

---

### OUT-04 · Payment Reminders
**Module:** KR / KTS · **Impact:** 🟡 Mid · **Speed:** ⚡ Quick

Friendly outbound voice reminders when invoices are past due. Offers a payment link via SMS during the call. Escalates to collections queue if 2nd reminder is ignored.

- Trigger: Invoice overdue by 3, 7, and 14 days
- Output: Payment attempt logged to invoice record

---

---

## 🗓 Later — Medium Priority

### IN-01 · 24/7 Lead Intake
**Module:** KD · **Impact:** 🔴 High · **Speed:** 🕐 Timely

AI answers all inbound calls from ad campaigns (Google, Meta, TikTok). Qualifies the lead by trade, location, and budget. Creates a lead record in Firestore automatically and assigns it to the next available sales rep.

- Trigger: Inbound call to KD marketing line
- Output: New lead in `/leads` with `source`, `quality`, and customer info pre-filled
- Escalation: Transfers to live rep if caller requests or AI confidence is low

---

### IN-03 · Inbound Contractor Inquiry
**Module:** KTS · **Impact:** 🟡 Mid · **Speed:** ⚡ Quick

Prospect contractors call to inquire about joining the network. AI screens for trade type, license status, service area, and years of experience. Qualified candidates receive an onboarding link via SMS. Unqualified calls are politely declined.

- Trigger: Inbound call to KTS contractor recruitment line
- Output: Basic contractor profile stub created; onboarding link sent

---

### IN-04 · Customer Service Triage
**Module:** KR · **Impact:** 🟡 Mid · **Speed:** 🕐 Timely

Existing customers call in. AI reads their job history from Firestore, answers basic status questions (scheduled date, crew assigned, outstanding balance), and routes complex issues to the right person.

- Trigger: Inbound call from existing customer (matched by phone number)
- Output: Call summary logged to job record; routed to PM or billing as needed

---

### OUT-06 · Win-Back Campaigns
**Module:** KD / KR · **Impact:** 🟡 Mid · **Speed:** 🕐 Timely

Past customers silent for 12+ months receive a seasonal check-in call. AI references their past job, mentions any relevant seasonal services, and offers to book.

- Trigger: Customer with `paidInFull` job, no new job in 365 days
- Output: Lead re-created if interested; DNC flag set if declined

---

### OUT-08 · Warranty Check-Ins
**Module:** KR · **Impact:** 🟡 Mid · **Speed:** ⚡ Quick

Automated calls at 30-day and 1-year warranty milestones. AI checks customer satisfaction and surfaces any issues. If issue reported, creates a `serviceTicket` automatically.

- Trigger: Warranty `startDate` + 30 days / 365 days
- Output: Service ticket created if issue reported; satisfaction score logged

---

### OUT-09 · Homeowner Job Progress Updates
**Module:** KR · **Impact:** 🟡 Mid · **Speed:** ⚡ Quick

Automated progress update calls to homeowners as the job moves through key stages.

> Example: "Hi Sarah, this is an update from Key Renovations. Your bathroom remodel is 60% complete and on track for Friday."

- Trigger: Job stage changes to `production`, `started`, `complete`
- Output: Call log attached to job record

---

### FIELD-01 · Contractor Check-In / Check-Out
**Module:** KTS · **Impact:** 🟡 Mid · **Speed:** ⚡ Quick

Contractor dials a dedicated number when they arrive and leave a job site. AI confirms the job, logs the timestamp. Used for labor tracking and payroll.

- Trigger: Manual call by contractor
- Output: `checkIn` / `checkOut` timestamps logged to job record

---

### FIELD-02 · Voice Job Status Updates
**Module:** KTS · **Impact:** 🟡 Mid · **Speed:** 🕐 Timely

Contractor calls from the field to move a job stage or add a note — hands-free. No app interaction required.

- Trigger: Manual call by contractor
- Output: Job stage updated or note appended to job record

---

### FIELD-05 · Post-Job Tech Debrief
**Module:** KTS · **Impact:** 🟡 Mid · **Speed:** 🕐 Timely

After a job closes, AI calls the assigned tech with structured debrief questions: any issues encountered, parts that need restocking, customer feedback heard on site.

- Trigger: Job status changes to `complete`
- Output: QC notes logged to job; inventory restock flags raised if parts mentioned

---

---

## 🚀 Differentiators — Build the Moat

### UNIQUE-01 · 1099 Contractor Onboarding via Voice
**Module:** KTS · **Impact:** 🔴 High · **Speed:** 🕐 Timely

New contractor calls a dedicated onboarding line. AI walks them through W-9 collection, insurance certificate upload (links sent via SMS during call), direct deposit setup, and a spoken orientation. No human HR required.

> **Competitor Gap:** No FSM platform has this. Eliminates the biggest friction point in scaling a 1099 network.

---

### UNIQUE-05 · AI-Mediated Contractor Dispatch Acceptance Loop
**Module:** KTS · **Impact:** 🔴 High · **Speed:** ⚡ Quick

Full Uber-style loop: AI calls contractor → reads job details → records accept/decline via voice → updates job record → if declined, immediately calls the next recommended contractor.

> **Differentiator:** Dispatch without any app interaction on the contractor side.

---

### FIELD-04 · End-of-Day Sales Rep Debrief
**Module:** KD / KR · **Impact:** 🔴 High · **Speed:** 🕐 Timely

AI calls each sales rep at end of day and asks structured questions about their appointments. Responses transcribed and logged as CRM activity notes.

> **Differentiator:** Solves the universal problem of reps not logging activity. Voice is faster than typing.

- Trigger: Daily scheduled call per rep at configurable time
- Output: Activity notes logged to each job/lead the rep discussed

---

### IN-05 · AI Dispute De-escalation
**Module:** KR · **Impact:** 🔴 High · **Speed:** 🕐 Timely

Unhappy customer calls in. AI attempts resolution within pre-approved parameters — offer a re-visit, partial discount, or schedule adjustment — without needing a human.

- Trigger: Inbound call flagged with complaint keywords or negative sentiment
- Output: Resolution offer logged; escalation record created if unresolved
- Config: Admin sets resolution budget limits per job type

---

### UNIQUE-02 · Real-Time Sales Call Coaching
**Module:** KD / KR · **Impact:** 🔴 High · **Speed:** 🕐 Timely

AI listens to live sales calls and prompts the rep in real time via a discreet overlay — surfacing objection responses, relevant past customer examples, or upsell cues.

> **Competitor Gap:** Gong/Chorus do this in enterprise software sales. Nobody in home services FSM has it.

---

### UNIQUE-03 · Dynamic Pricing on Inbound Booking Calls
**Module:** KR · **Impact:** 🔴 High · **Speed:** 🕐 Timely

AI quotes within an admin-configured price range — applying emergency premiums for same-day requests or fill-day discounts for flexible customers.

> **Competitor Gap:** No FSM platform has dynamic voice pricing.

---

### FIELD-03 · Voice Scope Documentation
**Module:** KR / KTS · **Impact:** 🟡 Mid · **Speed:** 🕐 Timely

Tech or estimator narrates what they're seeing on a job site. AI transcribes, categorizes, and auto-populates the estimate or job notes.

---

### UNIQUE-04 · Voice-Triggered Inventory Logging
**Module:** KTS · **Impact:** 🟡 Mid · **Speed:** 🕐 Timely

Contractor calls from a job site and verbally reports materials used. AI parses the items, matches them to inventory, and decrements stock.

> **Differentiator:** Nobody has voice inventory logging.

---

### IN-06 · Spam / Robocall Filter
**Module:** All · **Impact:** 🟢 Low · **Speed:** ⚡ Quick

IVR qualifier on all inbound lines. Requires caller to press a key or state their name before connecting.

---

---

## Implementation Notes

### Tech Stack
| Layer | Technology |
|-------|------------|
| Voice AI | Vapi.ai |
| Telephony | Twilio (Voice + SMS) |
| Transcription | Deepgram |
| Call intelligence | Claude Sonnet |
| FSM integration | Firebase Cloud Functions |

### Firestore Collections Involved
- `voiceCalls` — call logs, transcripts, outcomes
- `inboundCalls` — inbound call records
- `leads` — updated on qualification and booking
- `jobs` — updated on status, crew, check-in/out, reminders, ratings
- `contractors` — dispatch acceptance tracking
- `ratingRequests` — post-job satisfaction scores
- `serviceTickets` — auto-created from warranty calls
- `inventoryStock` — decremented from voice inventory logging

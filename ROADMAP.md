# KeyHub Central — Product Roadmap

**Last Updated:** 2026-03-28
**Current Branch:** Enterprise (all 14 enterprise features deployed)

---

## Vision

A fully automated home services operations platform that runs under any brand. Leads come in from ads, AI qualifies them by phone, jobs get dispatched to contractors automatically, and owners see everything in one dashboard — without anyone uploading a spreadsheet or making a manual phone call.

---

## Status Legend

| Symbol | Meaning |
|---|---|
| ✅ | Built and deployed |
| 🔧 | In progress |
| 🔜 | Next up |
| 📋 | Planned |
| 💡 | Future / exploratory |

---

## Phase 1 — Foundation (Complete)
*Everything currently live on the enterprise branch.*

### Core Platform
- ✅ Next.js PWA with offline support (IndexedDB + background sync)
- ✅ Firebase Auth with role-based access (owner, admin, PM, sales rep, contractor, partner, customer, subscriber)
- ✅ Pending approval flow for new users
- ✅ Mobile-first responsive design (bottom nav mobile, side nav desktop)
- ✅ White-label config system (`lib/config/tenant.ts`)
- ✅ White-label script (`scripts/white-label.js`)

### KTS — Contractor Management
- ✅ Contractor profiles, W-9, insurance, compliance tracking
- ✅ Job pipeline (Lead → Sold → Front End Hold → Production → Scheduled → Started → Complete → Paid in Full)
- ✅ Smart scheduling with 5-factor AI scoring (availability, distance, rating, workload, tier)
- ✅ Bulk schedule optimizer
- ✅ Contractor availability management
- ✅ Contractor portal (jobs, earnings, availability, inventory)
- ✅ Cross-dealer labor marketplace (listings, bidding, contractor feed)
- ✅ Inventory management (items, locations, stock, counts)
- ✅ Performance rating system (Elite / Pro / Standard / Needs Improvement / Probation)

### KR — Renovations
- ✅ Job contracts with e-signature (remote token-based signing with audit trail)
- ✅ Completion certificates
- ✅ AI job risk scoring (6-factor weighted model)
- ✅ Service tickets with photo uploads and timestamps
- ✅ Partner portal (labor requests, service tickets)
- ✅ Customer portal (real-time job tracking, photos, service requests, booking)

### KD — Lead Generation
- ✅ Lead management (pipeline, assignment, return window)
- ✅ Bulk lead import with Claude AI parsing (CSV, Excel, PDF, image)
- ✅ Campaign tracking with ROI metrics (CPL, CPA, CPS, ROI%)
- ✅ Subscriber portal and subscription management
- ✅ Lead auto-assignment by proximity (50-mile radius)

### Voice & AI
- ✅ Vapi inbound call answering with structured data extraction
- ✅ OUT-01: Speed-to-lead outbound calls (sub-60 second response)
- ✅ OUT-03: Post-job rating collection calls
- ✅ OUT-05: Appointment confirmation and reminder calls
- ✅ AI complaint detection and contractor notification
- ✅ Inbound call center dashboard with live queue

### Communications
- ✅ SMS conversations (Telnyx)
- ✅ AI SMS responses
- ✅ Email automation (templates, triggers, queue — 5 built-in templates via Resend)
- ✅ Outbound webhooks + API keys (HMAC-SHA256 signed)

### Financials & Reporting
- ✅ Invoices
- ✅ P&L
- ✅ Payouts
- ✅ Expenses and receipts (Claude AI OCR)
- ✅ Report builder (configurable metrics, PDF/CSV export)
- ✅ Predictive analytics (revenue forecast, lead predictions, demand forecast)

---

## Phase 2 — Lead Flow Automation (Current Sprint)

*Goal: Zero manual lead entry. Leads from every source flow in automatically, tagged to the right campaign.*

### Lead Integrations
- ✅ LeadsBridge webhook receiver (`/api/leads/webhook`) — auto-creates leads from Facebook, Google, TikTok via LeadsBridge
- ✅ Campaign selector on bulk import modal — tag all imported leads to a campaign at import time
- 🔜 **Auto-call trigger** — when a lead arrives via webhook or form, automatically kick off a Vapi outbound call within 60 seconds (extends OUT-01 to webhook-sourced leads)
- 🔜 **Campaign ID param on lead capture forms** — add `?campaignId=ID` support to public lead capture URLs so form submissions are attributed correctly
- 📋 **Direct platform API integrations** — native Google Ads Lead Form API and Meta Lead Ads webhook (eliminates LeadsBridge middleware for high-volume customers)

### Lead List UX
- 🔜 **Date range filter** — filter leads by creation date (today, last 7 days, this month, custom range)
- 🔜 **Sort options** — sort by newest, oldest, quality (hot first), status
- 🔜 **Pagination** — load 25 leads per page instead of all at once (performance at scale)
- 📋 **Saved filter presets** — save combinations like "Hot Google Ads leads this week"

---

## Phase 3 — White-Label Control Panel

*Goal: Manage all white-label customers from one dashboard without logging into each one separately.*

### Why It's Needed

Each white-label customer currently has their own Vercel deployment, their own Firebase project, and their own isolated user database. There's no way to manage them centrally without logging into each one individually. The control panel solves this.

### Architecture

#### The Control Panel App
- **URL:** `admin.keyhubcentral.com`
- **Access:** KeyHub team only — completely separate from any tenant
- **Tech:** Next.js, same stack as the main app
- **Auth:** KeyHub's own Firebase project (not any tenant's)

#### KeyHub Master Firebase — Tenant Registry Schema
```
tenants/
  {tenantId}/
    name: string
    domain: string
    tier: "starter" | "growth" | "business" | "enterprise"
    status: "active" | "suspended" | "onboarding"
    firebaseProjectId: string
    serviceAccountKey: string (encrypted)
    seats:
      included: number
      extra: number
      total: number
    billing:
      monthlyRate: number
      extraSeatRate: number
      onboardingFee: number
      nextBillingDate: timestamp
    usage:
      vapiMinutesUsed: number
      vapiMinutesLimit: number
      lastSyncedAt: timestamp
    features:
      leadEngine: boolean
      voiceAI: boolean
      marketplace: boolean
      predictiveAnalytics: boolean
      renovationsModule: boolean
      reportBuilder: boolean
      emailAutomation: boolean
      customerPortal: boolean
    createdAt: timestamp
    updatedAt: timestamp
```

#### Feature Flags in Each Tenant's Firestore (Critical)
Flags must live in the tenant's database — not in code — so the control panel can update them instantly without redeployment.
```
config/
  features/
    leadEngine: boolean
    voiceAI: boolean
    marketplace: boolean
    predictiveAnalytics: boolean
    renovationsModule: boolean
    reportBuilder: boolean
    emailAutomation: boolean
    customerPortal: boolean
```

#### Service Account Per Tenant
When onboarding a new customer:
1. Their Firebase project is created
2. A service account key is generated in their project
3. The key is stored encrypted in the master registry
4. The control panel uses this key to read usage data and write feature flag changes to their Firebase

### Module → Feature Flag Mapping

#### Main Branch Tiers — All Features On
Starter, Growth, Business customers get everything enabled. No flag management needed.

#### Enterprise — Module-Based

| Module | What It Includes | Default |
|---|---|---|
| **Core** | Jobs, contractors, scheduling, dispatch, documents, portal | Always on |
| **Lead Engine** | KD leads, campaigns, bulk import, ROI tracking | Add-on |
| **Voice & AI** | Vapi inbound/outbound, call center, AI routing | Add-on |
| **Marketplace** | Cross-dealer labor exchange, bidding | Add-on |
| **Predictive Analytics** | Revenue forecast, demand forecast, lead predictions | Add-on |
| **Renovations Module** | KR contracts, e-signature, risk scoring | Add-on |
| **Report Builder** | Configurable metrics, PDF/CSV export | Add-on |
| **Email Automation** | Templates, triggers, queue | Add-on |
| **Customer Portal** | Real-time job tracking, booking, service requests | Add-on |

#### Dependency Rules
- Voice & AI requires Core (always true)
- Marketplace requires Core (always true)
- Lead Engine is standalone
- Predictive Analytics works better with Lead Engine (warn but don't block)

### Build Order

#### Step 1 — Foundation
- 📋 Move feature flags from tenant config file into each tenant's Firestore
- 📋 Update tenant app to read flags from Firestore at runtime
- 📋 Add flag-based module gating to nav, routes, and API endpoints

#### Step 2 — Tenant Registry
- 📋 Create KeyHub master Firebase project
- 📋 Build tenant registry Firestore schema
- 📋 Build service account connection layer (encrypted key storage + Firebase Admin SDK)

#### Step 3 — Control Panel UI
- 📋 Tenant list dashboard — all customers, tier, seat usage, Vapi minutes, status, billing date
- 📋 Tenant detail page — feature flag toggles (instant, no redeploy), seat management, billing summary, activity log
- 📋 Onboarding wizard (see checklist below)
- 📋 Seat and billing management

#### Step 4 — Usage Monitoring
- 📋 Scheduled sync of Vapi minutes per tenant
- 📋 Seat usage tracking with upsell alerts
- 📋 Alerts when tenant approaches Vapi minute limit
- 📋 Usage history charts per tenant

#### Step 5 — Polish
- 📋 Activity log per tenant
- 📋 Bulk actions (suspend, reactivate, upgrade/downgrade tier)
- 📋 Stripe integration for automated monthly invoicing

### White-Label Customer Onboarding Checklist

Complete these steps for every new white-label customer. Covered by the onboarding fee.

#### 1. Initial Setup
- [ ] Collect company info: name, domain, brand colors, logo files, contact emails
- [ ] Select tier and confirm feature modules (enterprise) or confirm all-in (main)
- [ ] Create their Firebase project and enable Firestore, Auth, Storage, Functions
- [ ] Generate Firebase service account key → store encrypted in tenant registry

#### 2. Configure & Deploy
- [ ] Run white-label script: `node scripts/white-label.js tenant.json`
- [ ] Replace placeholder PWA icons in `/public/icons/` with customer logos
- [ ] Copy `.env.local.template` → `.env.local` and fill in all secrets
- [ ] Push to Vercel, connect custom domain
- [ ] Deploy Firestore rules: `npx firebase deploy --only firestore:rules`

#### 3. Email (Resend)
- [ ] Customer creates Resend account (or KeyHub manages it)
- [ ] Verify their sending domain in Resend
- [ ] Add `RESEND_API_KEY` to Vercel env vars
- [ ] Set `NEXT_PUBLIC_FROM_EMAIL` to their noreply address
- [ ] Test a transactional email (new user signup flow)

#### 4. Voice / AI (Vapi) — if Voice module enabled
- [ ] Customer creates Vapi account (or KeyHub manages it)
- [ ] Purchase phone number in Vapi
- [ ] Run Vapi setup script: `npx tsx scripts/setup-vapi.mjs`
- [ ] Add `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID` to Vercel env vars
- [ ] Register phone number with Free Caller Registry, Hiya, and CNAM for caller ID
- [ ] Test inbound call routing

#### 5. SMS (Telnyx) — if SMS features enabled
- [ ] Purchase Telnyx number
- [ ] Add `TELNYX_API_KEY`, `TELNYX_PHONE_NUMBER` to Vercel env vars
- [ ] Set `SMS_PROVIDER=telnyx`
- [ ] Test SMS send/receive

#### 6. Lead Integrations — if Lead Engine module enabled
- [ ] Generate a random webhook secret (e.g. `openssl rand -hex 32`)
- [ ] Add `LEADSBRIDGE_WEBHOOK_SECRET=<secret>` to Vercel env vars
- [ ] Provide customer their webhook URL:
  ```
  https://theirdomain.com/api/leads/webhook?token=<secret>&campaignId=CAMPAIGN_ID
  ```
- [ ] Walk customer through LeadsBridge setup for each ad platform:
  - Facebook Lead Ads → webhook URL (with their Meta campaign's campaignId)
  - Google Lead Form → webhook URL (with their Google campaign's campaignId)
  - TikTok Lead Gen → webhook URL (with their TikTok campaign's campaignId)
- [ ] Test a lead submission end-to-end (verify it appears in their KD leads)
- [ ] Show customer how to create campaigns in KD before going live so campaignId params are ready

#### 7. Google Calendar — if scheduling features enabled
- [ ] Customer sets up Google OAuth app or uses KeyHub's shared OAuth client
- [ ] Add `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` to Vercel env vars
- [ ] Test calendar sync

#### 8. Final Checks
- [ ] Create owner account and confirm role-based access works
- [ ] Seed sample data if requested
- [ ] Confirm PWA installs correctly on mobile (iOS + Android)
- [ ] Confirm custom domain SSL is active
- [ ] Add tenant to KeyHub super-admin registry
- [ ] Set feature flags in registry to match their tier
- [ ] Hand off login credentials and documentation

---

## Phase 4 — Voice AI Expansion

*Goal: AI handles every repetitive phone interaction across the platform.*
*Full details in `VOICE_ENHANCEMENTS.md`.*

### High Priority
- 🔜 **IN-02: Emergency job line** — after-hours AI triage, auto-pages on-call PM for emergencies
- 🔜 **OUT-07: Contractor job dispatch** — Uber-style loop: AI calls contractor with job details, records accept/decline, calls next contractor if declined
- 🔜 **OUT-02: Estimate follow-up** — AI calls leads with outstanding quotes at 48-hour mark
- 🔜 **OUT-04: Payment reminders** — voice reminders for overdue invoices, sends payment link via SMS during call

### Medium Priority
- 📋 **IN-01: 24/7 lead intake** — AI answers all inbound ad campaign calls, qualifies lead, creates record, routes to sales rep
- 📋 **IN-03: Inbound contractor inquiry** — AI screens prospective contractors, sends onboarding link to qualified candidates
- 📋 **IN-04: Customer service triage** — AI reads job history and answers status questions from existing customers
- 📋 **OUT-06: Win-back campaigns** — seasonal check-in calls to past customers silent for 12+ months
- 📋 **OUT-08: Warranty check-ins** — 30-day and 1-year milestone calls, auto-creates service ticket if issue reported
- 📋 **OUT-09: Job progress updates** — automated homeowner progress calls as job moves through stages
- 📋 **FIELD-01: Contractor check-in/check-out** — dedicated dial-in number for field time tracking
- 📋 **FIELD-02: Voice job status updates** — contractor calls from field to move job stage or add notes hands-free

### Differentiators (Competitive Moat)
- 💡 **UNIQUE-01: 1099 onboarding via voice** — AI walks new contractors through W-9, insurance upload, direct deposit, and orientation entirely by phone
- 💡 **UNIQUE-02: Real-time sales call coaching** — AI listens to live sales calls and prompts rep via discreet overlay (no FSM competitor has this)
- 💡 **UNIQUE-03: Dynamic pricing on inbound calls** — AI quotes within admin-configured range, applies emergency premiums or fill-day discounts
- 💡 **UNIQUE-04: Voice inventory logging** — contractor reports materials used verbally from job site, AI decrements stock
- 💡 **UNIQUE-05: AI dispatch acceptance loop** — full Uber-style dispatch without any app interaction from contractor
- 💡 **FIELD-04: End-of-day sales rep debrief** — AI calls each rep at EOD, transcribes activity notes to CRM (solves the "reps don't log anything" problem)
- 💡 **FIELD-05: Post-job tech debrief** — structured AI debrief after job close, surfaces inventory restock needs and QC flags

---

## Phase 5 — Platform Integrations

*Goal: KeyHub plugs into everything a home services company already uses.*

### Third-Party Integrations
- 📋 **QuickBooks sync** — export invoices, expenses, and payouts to QuickBooks automatically
- 📋 **Stripe billing** — collect payments from homeowners directly in the platform
- 📋 **Checkr** — background check integration for contractor onboarding
- 📋 **TaxBandits** — automated W-9 / 1099-NEC filing
- 📋 **Indeed / ZipRecruiter** — post contractor recruiting listings directly from KTS
- 📋 **Google Ads API** — auto-sync campaign spend (eliminates manual spend entry, CPL updates in real time)
- 📋 **Meta Marketing API** — same as Google Ads, plus real-time Lead Ads webhook
- 📋 **TikTok Ads API** — campaign metrics and lead sync

### Internal Improvements
- 📋 **Two-way Google Calendar sync** — currently one-way, needs bidirectional conflict detection
- 📋 **Google Sheets sync** — scheduled export of job and financial data for reporting

---

## Phase 6 — Enterprise & Scale

*Goal: Support large multi-location operations and eventually true SaaS multi-tenancy.*

### Multi-Location
- 💡 **Multi-location support** — single tenant account managing multiple geographic branches with separate reporting
- 💡 **Location-based routing** — leads and jobs routed by branch/market automatically

### True Multi-Tenancy (Long-Term)
- 💡 **Domain-based tenant routing** — single codebase serves all tenants, routing by domain
- 💡 **Shared Firestore with tenant isolation** — one database, Firestore rules enforce tenant boundaries
- 💡 **Runtime theming** — colors and branding switch per tenant at runtime (no build step)
- 💡 **Tenant self-service portal** — customers can manage their own branding and settings without contacting KeyHub

### Analytics & AI
- 💡 **Cross-tenant benchmarking** — anonymized performance comparisons ("your CPL vs. industry average")
- 💡 **AI-powered sales coaching dashboard** — aggregates call outcomes, win rates, and coaching flags per rep
- 💡 **Churn prediction** — flags customers at risk of canceling based on usage patterns

---

## Pricing Tiers (Reference)

See `PRICING.md` for full breakdown.

| Tier | Contractors | Monthly | Setup Fee |
|---|---|---|---|
| Starter | 1–10 | $499/mo | $499 |
| Growth | 11–25 | $849/mo | $1,499 |
| Business | 26–50 | $1,299/mo | $2,999 |
| Scale | 51–100 | $1,999/mo | $4,999 |
| Enterprise | 100+ | Custom | Custom |

Extra seats: $75/seat. AI voice overage: $0.12/min.

---

## Key Decisions on Record

- **Separate deployments per tenant** (not true multi-tenancy) — right architecture for current scale, revisit at 10+ customers
- **Feature flags must live in Firestore** — not in code — so control panel can update them without redeployment
- **Module-based for enterprise, all-in for main branch** — main branch customers get everything, enterprise customers pick modules
- **No cherry-picking within modules** — each module is a self-contained bundle to prevent dependency conflicts
- **LeadsBridge as middleware** for ad platform leads — native API integrations come later when volume justifies it
- **$75/seat** for extra seats — market supports it, $50 was underpriced
- **Annual pricing push** — annual contracts save customers 2 months and dramatically reduce churn

---

## Future Feature Ideas (Backlog)

These ideas have been captured for future consideration but not yet scoped:

| Idea | Description | Priority |
|------|-------------|----------|
| **AI PowerPoint / Presentation Builder** | Allow users to select report data + write a prompt, and have Claude AI generate a fully designed, editable PowerPoint (.pptx) that tells a data story with visuals (charts, KPI slides, trend summaries). Export as real .pptx file using a library like `pptxgenjs`. The deck would use the tenant's brand colors and logo, auto-populate charts from the selected metrics, and include narrative text generated by Claude. Target: sales teams showing clients ROI, PMs giving project status updates, executives doing board reviews. | High |
| **Report Scheduling & Email Delivery** | Automatically run saved reports on a cron schedule (weekly/monthly) and email PDF/CSV to designated recipients. | Medium |
| **Custom Branding Per Report** | Allow custom cover page content, logo override, and footer text per saved report configuration. | Low |

---

*For voice AI feature details, see `VOICE_ENHANCEMENTS.md`*
*For pricing breakdown and competitive analysis, see `PRICING.md`*

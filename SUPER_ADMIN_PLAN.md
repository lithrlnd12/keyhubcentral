# KeyHub Super-Admin Control Panel — Architecture Plan

## Overview

A centralized control panel (`admin.keyhubcentral.com`) that allows the KeyHub team to manage all white-label tenants from one place — flipping feature flags, monitoring usage, and onboarding new customers without touching code or logging into each tenant separately.

---

## The Problem With the Current Architecture

Each white-label customer currently has:
- Their own Vercel deployment
- Their own Firebase project
- Their own isolated user database
- Feature flags baked into code (requires redeployment to change)

This means there is no way to manage customers centrally without logging into each one individually.

---

## The Solution — Option B: Separate Control Panel

### What It Is
A separate app owned and operated by KeyHub that connects to every tenant's Firebase via service account credentials. KeyHub team logs in once and can see and manage all customers from a single dashboard.

---

## Architecture

### 1. KeyHub Master Firebase Project
A dedicated Firebase project just for the control panel — separate from any white-label tenant.

Firestore collection structure:
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

### 2. Feature Flags Move to Firestore (Critical Change)
Feature flags must live in **each tenant's Firestore**, not in their code. This allows the control panel to update them instantly without redeployment.

Each tenant's Firebase will have:
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

The tenant app reads this at runtime to show/hide modules.

### 3. Service Account Per Tenant
When onboarding a new customer:
1. Their Firebase project is set up
2. A service account is generated in their Firebase project
3. The service account key is stored (encrypted) in the master Firebase registry
4. The control panel uses this key to read usage data and write feature flag changes

### 4. The Control Panel App
**URL:** `admin.keyhubcentral.com`
**Access:** KeyHub team only (separate auth from any tenant)
**Tech:** Next.js, same stack as the main app

---

## Control Panel Features

### Tenant List Dashboard
- All tenants in a table: name, tier, seat usage, Vapi minutes, status, billing date
- Color-coded status badges (active, suspended, onboarding)
- Quick search by name or domain

### Tenant Detail Page
- Full tenant profile
- Feature flags panel — toggle switches, save instantly (no redeploy)
- Seat management — adjust included seats, extra seat count
- Vapi usage meter — minutes used vs limit this billing period
- Billing summary
- Activity log

### Onboarding Flow
Step-by-step wizard to add a new tenant:
1. Enter company info (name, domain, contact)
2. Select tier
3. Configure feature flags for their tier
4. Enter their Firebase project ID + upload service account key
5. Set billing details
6. Generate their tenant config file
7. Trigger white-label script (or provide instructions)

### Usage Monitoring
- Sync usage data from each tenant's Firebase on a schedule (cron)
- Alert when a tenant is approaching Vapi minute limits
- Alert when seat count is near tier limit (upsell opportunity)

---

## Tier → Feature Flag Mapping

### Main Branch Tiers (Give Them Everything)
Starter, Growth, Business customers on the main branch get all features enabled. No flag management needed.

### Enterprise Tiers (Module-Based)

| Module | Description | Included In |
|---|---|---|
| **Core** | Jobs, contractors, scheduling, dispatch, documents, portal | All tiers |
| **Lead Engine** | KD leads, campaigns, bulk import, ROI tracking | Add-on |
| **Voice & AI** | Vapi inbound/outbound, call center, AI routing | Add-on |
| **Marketplace** | Cross-dealer labor exchange, bidding | Add-on |
| **Predictive Analytics** | Revenue forecast, demand forecast, lead predictions | Add-on |
| **Renovations Module** | KR contracts, e-signature, risk scoring | Add-on |
| **Report Builder** | Configurable metrics, PDF/CSV export | Add-on |
| **Email Automation** | Templates, triggers, queue | Add-on |
| **Customer Portal** | Real-time job tracking, booking, service requests | Add-on |

---

## Dependency Rules (Important)
Some modules depend on others. The control panel must enforce these:

- **Voice & AI** requires **Core** (always true)
- **Marketplace** requires **Core** (always true)
- **Lead Engine** is standalone
- **Predictive Analytics** works better with **Lead Engine** enabled (warn but don't block)
- No other hard dependencies — modules are designed to be self-contained

This prevents turning off something that breaks something else.

---

## Build Order

### Phase 1 — Foundation
- [ ] Move feature flags from tenant config file into each tenant's Firestore
- [ ] Update tenant app to read flags from Firestore at runtime
- [ ] Add flag-based module gating to nav, routes, and API endpoints

### Phase 2 — Tenant Registry
- [ ] Create KeyHub master Firebase project
- [ ] Build tenant registry Firestore schema
- [ ] Build service account connection layer (encrypted key storage + Firebase Admin SDK)

### Phase 3 — Control Panel UI
- [ ] Tenant list dashboard
- [ ] Tenant detail page with feature flag toggles
- [ ] Onboarding wizard (see checklist below)
- [ ] Seat and billing management

### Phase 4 — Usage Monitoring
- [ ] Scheduled sync of Vapi minutes per tenant
- [ ] Seat usage tracking
- [ ] Alerts for limits approaching
- [ ] Usage history charts

### Phase 5 — Polish
- [ ] Activity log per tenant
- [ ] Bulk actions (suspend, reactivate, upgrade tier)
- [ ] Billing integration (Stripe) for automated invoicing

---

## White-Label Customer Onboarding Checklist

Complete these steps for every new white-label customer. Covered by the onboarding fee.

### 1. Initial Setup
- [ ] Collect company info: name, domain, brand colors, logo files, contact emails
- [ ] Select tier and confirm feature modules (enterprise) or confirm all-in (main)
- [ ] Create their Firebase project and enable Firestore, Auth, Storage, Functions
- [ ] Generate Firebase service account key → store encrypted in tenant registry

### 2. Configure & Deploy
- [ ] Run white-label script: `node scripts/white-label.js tenant.json`
- [ ] Replace placeholder PWA icons in `/public/icons/` with customer logos
- [ ] Copy `.env.local.template` → `.env.local` and fill in all secrets
- [ ] Push to Vercel, connect custom domain
- [ ] Deploy Firestore rules: `npx firebase deploy --only firestore:rules`

### 3. Email (Resend)
- [ ] Customer creates Resend account (or KeyHub manages it)
- [ ] Verify their sending domain in Resend
- [ ] Add `RESEND_API_KEY` to Vercel env vars
- [ ] Set `NEXT_PUBLIC_FROM_EMAIL` to their noreply address
- [ ] Test a transactional email (new user signup flow)

### 4. Voice / AI (Vapi) — if Voice module enabled
- [ ] Customer creates Vapi account (or KeyHub manages it)
- [ ] Purchase phone number in Vapi
- [ ] Run Vapi setup script: `npx tsx scripts/setup-vapi.mjs`
- [ ] Add `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID` to Vercel env vars
- [ ] Register phone number with Free Caller Registry, Hiya, and CNAM for caller ID
- [ ] Test inbound call routing

### 5. SMS (Telnyx) — if SMS features enabled
- [ ] Purchase Telnyx number
- [ ] Add `TELNYX_API_KEY`, `TELNYX_PHONE_NUMBER` to Vercel env vars
- [ ] Set `SMS_PROVIDER=telnyx`
- [ ] Test SMS send/receive

### 6. Lead Integrations — if Lead Engine module enabled
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

### 7. Google Calendar — if scheduling features enabled
- [ ] Customer sets up Google OAuth app or uses KeyHub's shared OAuth client
- [ ] Add `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET` to Vercel env vars
- [ ] Test calendar sync

### 8. Final Checks
- [ ] Create owner account and confirm role-based access works
- [ ] Seed sample data if requested
- [ ] Confirm PWA installs correctly on mobile (iOS + Android)
- [ ] Confirm custom domain SSL is active
- [ ] Add tenant to KeyHub super-admin registry
- [ ] Set feature flags in registry to match their tier
- [ ] Hand off login credentials and documentation

---

## Pricing Reference (Main Branch)

| Tier | Monthly | Onboarding | Seats | Extra Seats |
|---|---|---|---|---|
| Starter | $599 | $599 | 1-5 | $75/seat (up to 5 more) |
| Growth | $1,599 | $1,599 | 6-20 | $75/seat |
| Business | $2,599 | $2,599 | 21-50 | $75/seat |

---

## Notes & Decisions Made

- **$75/seat** for extra seats (not $50 — too low margin, market supports $75)
- **Package deal** for main branch — all features included, no cherry picking
- **Module-based** for enterprise — Core always included, add-ons priced separately
- **No feature cherry picking within modules** — each module is a self-contained bundle to avoid dependency conflicts
- **Start with Option B from day one** — building the right architecture now avoids painful refactoring later
- Feature flags must be in Firestore (not code) for the control panel to work without redeployment

---

*Last updated: 2026-03-28*

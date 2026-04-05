# CLAUDE.md - KeyHub Central

## Project Overview

KeyHub Central is a PWA for managing three interconnected businesses:
- **Keynote Digital (KD)** -- Lead generation, ad campaigns, ROI tracking & marketing subscriptions
- **Key Trade Solutions (KTS)** -- 1099 contractor network (installers, sales reps, PMs, service techs), call center, marketplace
- **Key Renovations (KR)** -- D2C home renovation sales, contracts, completion certs, risk scoring

See `DOCUMENTATION.md` for full technical documentation, data models, security, and module specs.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router, PWA) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Hosting | Vercel |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage + Google Drive API |
| Backend | Firebase Cloud Functions |
| Calendar | Google Calendar API (2-way sync) |
| Email | Resend (migrated from Gmail/nodemailer), email automation templates + queue |
| SMS | Telnyx (production), Textbelt (testing), Twilio (legacy option) |
| Voice | Vapi AI (inbound + outbound, AI routing, dispatch, rating calls, reminders) |
| AI | Anthropic Claude (receipt OCR, lead import parsing, risk scoring) |
| PDF | @react-pdf/renderer (contracts, completion certs, invoices, job packages, P&L, reports, addendums, disclosures) |
| Charts | Recharts |
| Offline | IndexedDB + Background Sync (PWA) |
| Validation | Zod |
| Testing | Playwright (e2e), custom integration test script |

## Commands

```bash
# Development
npm run dev                                    # Start dev server (localhost:3000)
npm run build                                  # Production build
npm run lint                                   # ESLint

# Firebase
npx firebase deploy --only firestore:rules     # Deploy Firestore rules

# Testing
npx playwright test                            # Run Playwright e2e tests
npx tsx scripts/enterprise-test.ts <url> [token]  # Run enterprise integration tests

# White-Label
node scripts/white-label.js <tenant.json>      # Generate white-label tenant config
node scripts/white-label.js --example          # Generate example tenant JSON

# Deployment
git push origin main                           # Auto-deploys to Vercel
```

## Project Structure

```
keyhub-central/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Auth pages (login, signup, pending, forgot-password)
│   ├── (dashboard)/             # Protected routes
│   │   ├── overview/            # Main dashboard
│   │   ├── kts/                 # Key Trade Solutions (contractors, availability, inventory, calls, marketplace)
│   │   ├── kr/                  # Key Renovations (jobs, pipeline, contracts, signing)
│   │   ├── kd/                  # Keynote Digital (leads, campaigns, subscribers)
│   │   ├── financials/          # Invoices, P&L, payouts, expenses, earnings
│   │   ├── admin/               # User management, partners, seed, reports, analytics, job history
│   │   ├── subscriber/          # Subscriber portal (leads, subscription)
│   │   ├── calendar/            # Calendar, smart scheduling
│   │   ├── messages/            # SMS conversations
│   │   ├── settings/            # User settings, webhooks, email automation
│   │   └── profile/             # User profile
│   ├── portal/                  # Contractor portal (jobs, earnings, availability, inventory)
│   ├── partner/                 # Partner portal (labor requests, service tickets)
│   ├── customer/                # Customer portal (projects, booking, find pros)
│   ├── api/                     # API routes (webhooks, integrations, AI, email, voice, contracts)
│   ├── lead-generator/          # Public lead capture (event QR codes)
│   ├── sign/                    # Remote e-signature pages
│   ├── rate/                    # Public customer rating page
│   ├── capture/                 # Lead capture
│   └── legal/                   # Legal pages (privacy, SMS terms)
├── components/
│   ├── ui/                      # Reusable UI components
│   ├── forms/                   # Form components
│   ├── charts/                  # Dashboard visualizations
│   ├── navigation/              # Nav components
│   ├── pdf/                     # PDF document renderers
│   ├── contracts/               # Contract signing components
│   ├── jobs/                    # Job pipeline components
│   ├── leads/                   # Lead management components
│   ├── campaigns/               # Campaign components
│   ├── contractors/             # Contractor management
│   ├── inventory/               # Inventory management
│   ├── calls/                   # Call center components
│   ├── inboundCalls/            # Inbound call dashboard
│   ├── marketplace/             # Cross-dealer labor marketplace
│   ├── scheduling/              # Smart scheduling
│   ├── analytics/               # Predictive analytics
│   ├── reports/                 # Report builder
│   ├── email/                   # Email automation
│   ├── integrations/            # Webhooks, API keys
│   ├── customer/                # Customer portal components
│   ├── ratings/                 # Rating system
│   ├── availability/            # Contractor availability
│   ├── calendar/                # Calendar components
│   ├── chat/                    # AI chat assistant
│   ├── invoices/                # Invoice components
│   ├── messages/                # SMS messaging
│   ├── notifications/           # Notification components
│   ├── subscriptions/           # Subscription management
│   ├── settings/                # Settings components
│   ├── maps/                    # Map components
│   ├── dashboard/               # Dashboard widgets
│   ├── kd/                      # KD-specific components
│   └── portal/                  # Portal components
├── lib/
│   ├── firebase/                # Firebase CRUD helpers (30+ modules)
│   ├── hooks/                   # Custom React hooks (30+ hooks)
│   ├── utils/                   # Utility functions
│   ├── auth/                    # Auth verification, webhook signatures
│   ├── config/                  # Tenant config (white-label)
│   ├── contexts/                # React contexts (Sidebar, etc.)
│   ├── email/                   # Email templates, queue, automation
│   ├── sms/                     # SMS provider, AI responses
│   ├── vapi/                    # Voice call client & types
│   ├── ai/                      # AI utilities (risk scoring, parsing)
│   ├── offline/                 # IndexedDB + background sync
│   ├── webhooks/                # Outbound webhooks, HMAC signing
│   └── env.ts                   # Environment variable validation (Zod)
├── types/                       # TypeScript interfaces
├── functions/
│   └── src/
│       ├── triggers/            # Firestore triggers (invoices, leads, notifications, ratings, email, voice)
│       ├── scheduled/           # Cron jobs (calendar sync, sheets sync)
│       ├── config/              # Tenant config for functions
│       ├── lib/                 # Shared Cloud Function utilities
│       ├── utils/               # Email utilities
│       └── index.ts             # Function exports
├── scripts/                     # CLI scripts (white-label, seeding, Vapi setup, migration)
├── e2e/                         # Playwright E2E tests
├── firestore.rules              # Firestore security rules
├── storage.rules                # Storage security rules
└── public/                      # Static assets & PWA manifest
```

## Key Patterns

### Authentication & Roles

Users sign up -> land in `pending` status -> Admin approves & assigns role.

**Roles:** `owner`, `admin`, `sales_rep`, `pm`, `contractor`, `partner`, `customer`, `subscriber`, `pending`

```typescript
// Check role in components
const { user, role } = useAuth();
if (!['owner', 'admin'].includes(role)) redirect('/unauthorized');
```

### Portals

- **Admin Dashboard** (owner/admin): Full access, reports, analytics, email automation, webhooks
- **Contractor Portal**: Jobs, calendar, availability, inventory, marketplace, financials
- **Partner Portal**: Labor requests, service tickets, history
- **Customer Portal**: Projects, booking, find pros, service requests
- **Subscriber Portal**: Leads, subscription management

### Firestore Collections

Primary collections: `users`, `contractors`, `jobs`, `leads`, `invoices`, `campaigns`, `subscriptions`, `serviceTickets`, `partners`, `laborRequests`, `partnerServiceTickets`, `inventoryItems`, `inventoryLocations`, `inventoryStock`, `inventoryCounts`, `receipts`, `expenses`, `notifications`, `ratingRequests`, `payouts`, `smsConversations`, `voiceCalls`, `inboundCalls`, `contracts`, `conversations`, `marketplaceListings`, `remoteSigningSessions`, `emailTemplates`, `emailQueue`, `webhookEndpoints`, `webhookDeliveries`, `apiKeys`, `routingRules`, `savedReports`

See `DOCUMENTATION.md` -> Data Models section for full schemas.

### File Uploads

- W-9, insurance docs -> Firebase Storage (`/contractors/{uid}/documents/`)
- Job photos -> Firebase Storage (`/jobs/{jobId}/photos/`)
- Large files / Drive integration -> Google Drive API

### Mobile-First

- Desktop: Side navigation
- Mobile: Bottom tab navigation
- All components must be touch-friendly and responsive
- Offline support via IndexedDB queue + background sync

## Enterprise Features

All 14 enterprise features are deployed:

1. **Bulk Lead Import** -- AI-powered CSV/Excel/PDF parsing
2. **Marketing ROI Tracking** -- CPL, CPA, CPS, ROI%, revenue attribution
3. **Remote E-Signature** -- Token-based email signing with audit trail
4. **Offline PWA** -- IndexedDB queue, background sync
5. **Report Builder** -- Configurable metrics, filters, PDF/CSV export
6. **Email Automation** -- Templates, triggers, queue, 5 built-in templates
7. **Appointment Scheduling** -- Booking widget, conflict detection, Google Calendar
8. **Outbound Webhooks + API Keys** -- HMAC-SHA256, replaces need for Zapier
9. **Call Center** -- Inbound calls, live dashboard, call queue, recording player
10. **AI Job Risk Scoring** -- 6-factor weighted model, recommendations
11. **Cross-Dealer Labor Marketplace** -- Listings, bidding, contractor feed
12. **AI Smart Scheduling** -- 5-factor scoring, bulk optimizer
13. **Real-Time Customer Portal** -- Job tracking, photos, service requests
14. **Predictive Analytics** -- Revenue forecast, lead predictions, demand forecast

## AI-Powered Features

- Vapi inbound call answering with structured data extraction
- Vapi outbound calls: lead calling, appointment reminders, rating calls, dispatch, compliance reminders, quote follow-ups
- AI routing: checkTeamAvailability, requestCallback, routeAndNotify tools
- Claude AI receipt/document OCR
- Claude AI lead import parsing
- AI risk scoring for jobs
- AI smart scheduling optimization
- Predictive analytics with forecasting

## White-Label

Single config file (`lib/config/tenant.ts`) controls all branding. White-label script generates tenant config, CSS variables, Firebase config, env template, and PWA icons.

```bash
node scripts/white-label.js --example   # Generate example tenant JSON
node scripts/white-label.js tenant.json  # Apply tenant config
```

## Conventions

### Code Style
- TypeScript strict mode
- Functional components with hooks
- Server Components by default, `'use client'` only when needed
- Tailwind CSS for styling

### Naming
- Components: PascalCase (`ContractorCard.tsx`)
- Hooks: camelCase with `use` prefix (`useContractors.ts`)
- Utils: camelCase (`formatCurrency.ts`)
- Firestore docs: camelCase fields

### State Management
- Server state: React Query / SWR with Firebase
- Local state: React useState/useReducer
- Auth state: React Context (`AuthProvider`)

## Environment Variables

```env
# .env.local

# Firebase (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# App
NEXT_PUBLIC_APP_URL=

# AI
ANTHROPIC_API_KEY=

# Voice (Vapi)
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=
VAPI_ASSISTANT_ID=

# SMS
SMS_PROVIDER=                   # telnyx | textbelt | twilio
TELNYX_API_KEY=
TELNYX_PHONE_NUMBER=

# Email
RESEND_API_KEY=

# Cron
CRON_SECRET=

# LeadsBridge webhook
LEADSBRIDGE_WEBHOOK_SECRET=

# Google (server-side)
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
```

## Current Phase

**Enterprise** -- All 14 enterprise features deployed. White-label ready.

## Quick Reference

| Need | Location |
|------|----------|
| Full technical docs | `DOCUMENTATION.md` |
| Data models | `DOCUMENTATION.md` -> Section 5 |
| Role permissions | `DOCUMENTATION.md` -> Section 3 |
| Security details | `DOCUMENTATION.md` -> Section 4 |
| API routes | `app/api/` |
| White-label config | `lib/config/tenant.ts` |
| Job stages | Lead -> Sold -> Front End Hold -> Production -> Scheduled -> Started -> Complete -> Paid in Full |
| Subscription tiers | Starter ($399), Growth ($899), Pro ($1,499+) |
| Commission rates | Elite 10%, Pro 9%, Standard 8% |

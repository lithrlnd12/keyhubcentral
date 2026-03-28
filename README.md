# KeyHub Central

A Progressive Web App (PWA) for managing three interconnected businesses under one unified platform. White-label ready with 14 enterprise features deployed.

## Business Units

- **Keynote Digital (KD)** - Lead generation, ad campaigns, ROI tracking & marketing subscriptions
- **Key Trade Solutions (KTS)** - 1099 contractor network (installers, sales reps, PMs, service techs), call center, marketplace
- **Key Renovations (KR)** - D2C home renovation sales, contracts, completion certs, project management

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
| Email | Resend (email automation templates + queue) |
| SMS | Telnyx (production), Textbelt (testing), Twilio (legacy) |
| Voice | Vapi AI (inbound + outbound, AI routing, dispatch, rating calls, reminders) |
| AI | Anthropic Claude (receipt OCR, lead import parsing, risk scoring, predictive analytics) |
| PDF | @react-pdf/renderer (contracts, completion certs, invoices, job packages, P&L, reports, addendums, disclosures) |
| Charts | Recharts |
| Offline | IndexedDB + Background Sync |
| Validation | Zod |
| Testing | Playwright (e2e), custom integration test script |

## Prerequisites

- Node.js 18+
- npm
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore, Auth, and Storage enabled

## Getting Started

```bash
# 1. Clone the repository
git clone <repo-url>
cd keyhub-central

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.local.example .env.local
# Fill in your Firebase credentials and API keys (see CLAUDE.md for full list)

# 4. Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx playwright test` | Run Playwright e2e tests |
| `npx tsx scripts/enterprise-test.ts <url> [token]` | Run enterprise integration tests |
| `npx firebase deploy --only firestore:rules` | Deploy Firestore security rules |
| `node scripts/white-label.js <tenant.json>` | Generate white-label tenant config |
| `node scripts/white-label.js --example` | Generate example tenant JSON |

## Project Structure

```
keyhub-central/
├── app/
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
│   │   └── settings/            # User settings, webhooks, email automation
│   ├── portal/                  # Contractor portal (jobs, earnings, availability, inventory)
│   ├── partner/                 # Partner portal (labor requests, service tickets)
│   ├── customer/                # Customer portal (projects, booking, find pros)
│   ├── api/                     # API routes (webhooks, integrations, AI, email, voice, contracts)
│   ├── sign/                    # Remote e-signature pages
│   ├── lead-generator/          # Public lead capture (event QR codes)
│   ├── rate/                    # Public customer rating page
│   └── legal/                   # Legal pages (privacy, SMS terms)
├── components/                  # UI, forms, charts, nav, PDF, contracts, jobs, leads, calls, etc.
├── lib/
│   ├── firebase/                # Firebase CRUD helpers (30+ modules)
│   ├── hooks/                   # Custom React hooks (30+ hooks)
│   ├── utils/                   # Utility functions
│   ├── auth/                    # Auth verification, webhook signatures
│   ├── config/                  # Tenant config (white-label)
│   ├── contexts/                # React contexts
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
│       └── index.ts             # Function exports
├── scripts/                     # CLI scripts (white-label, seeding, Vapi setup, migration)
├── e2e/                         # Playwright E2E tests
├── firestore.rules              # Firestore security rules
├── storage.rules                # Storage security rules
└── public/                      # Static assets & PWA manifest
```

## Features

### Core Modules

**Keynote Digital (KD)**
- Lead management with bulk AI-powered import (CSV/Excel/PDF parsing)
- Campaign management with ROI tracking (CPL, CPA, CPS, ROI%, revenue attribution)
- Subscriber management and subscription tiers
- Facebook/Meta lead ads webhook integration
- Event lead capture with QR codes

**Key Trade Solutions (KTS)**
- Contractor management with onboarding wizard
- Inbound call center with live dashboard, call queue, and recording player
- Inventory management with AI receipt parsing
- Cross-dealer labor marketplace (listings, bidding, contractor feed)
- AI smart scheduling (5-factor scoring, bulk optimizer)
- Contractor availability and ratings

**Key Renovations (KR)**
- Job pipeline (Kanban) with 8-stage workflow
- Contract signing (in-person digital + remote e-signature with audit trail)
- Completion certificates and addendums
- Job photos, costs, crew assignment, measurements
- Commission tracking (Elite 10%, Pro 9%, Standard 8%)
- AI job risk scoring (6-factor weighted model with recommendations)
- Activity feed per job

### Enterprise Features

1. Bulk Lead Import -- AI-powered CSV/Excel/PDF parsing
2. Marketing ROI Tracking -- CPL, CPA, CPS, ROI%, revenue attribution
3. Remote E-Signature -- Token-based email signing with audit trail
4. Offline PWA -- IndexedDB queue, background sync
5. Report Builder -- Configurable metrics, filters, PDF/CSV export
6. Email Automation -- Templates, triggers, queue, 5 built-in templates
7. Appointment Scheduling -- Booking widget, conflict detection, Google Calendar
8. Outbound Webhooks + API Keys -- HMAC-SHA256, replaces need for Zapier
9. Call Center -- Inbound calls, live dashboard, call queue, recording player
10. AI Job Risk Scoring -- 6-factor weighted model, recommendations
11. Cross-Dealer Labor Marketplace -- Listings, bidding, contractor feed
12. AI Smart Scheduling -- 5-factor scoring, bulk optimizer
13. Real-Time Customer Portal -- Job tracking, photos, service requests
14. Predictive Analytics -- Revenue forecast, lead predictions, demand forecast

### AI-Powered Features

- Vapi inbound call answering with structured data extraction
- Vapi outbound calls: lead calling, appointment reminders, rating calls, dispatch, compliance reminders, quote follow-ups
- AI routing: checkTeamAvailability, requestCallback, routeAndNotify tools
- Claude AI receipt/document OCR
- Claude AI lead import parsing
- AI risk scoring for jobs
- AI smart scheduling optimization
- Predictive analytics with forecasting

### Portals

- **Admin Dashboard** (owner/admin): Full access, reports, analytics, email automation, webhooks
- **Contractor Portal**: Jobs, calendar, availability, inventory, marketplace, financials
- **Partner Portal**: Labor requests, service tickets, history
- **Customer Portal**: Projects, booking, find pros, service requests
- **Subscriber Portal**: Leads, subscription management

## Authentication

Users follow this flow:
1. **Sign up** - Account created with `pending` status
2. **Pending approval** - Admin reviews and approves
3. **Active** - Full access based on assigned role

### Roles

| Role | Access |
|------|--------|
| `owner` | Full system access |
| `admin` | User management, all modules |
| `sales_rep` | KR jobs, assigned leads, commissions |
| `contractor` | Contractor portal, assigned jobs |
| `pm` | Job management, crew assignment |
| `partner` | Partner portal (labor requests, tickets) |
| `customer` | Customer portal (projects, booking, service requests) |
| `subscriber` | KD leads portal only |

## Security

- Firebase Authentication with custom claims
- Firestore security rules with role-based access control
- Storage rules with file type/size validation
- Webhook signature verification (Vapi, Facebook, outbound HMAC-SHA256)
- Environment variable validation via Zod
- Server-side only API keys (no client exposure)
- Field-level write protection in Firestore rules
- Remote e-signature token verification with audit trail

See [DOCUMENTATION.md](./DOCUMENTATION.md) Section 4 for full security details.

## White-Label

Single config file (`lib/config/tenant.ts`) controls all branding. The white-label script generates tenant config, CSS variables, Firebase config, env template, and PWA icons.

```bash
node scripts/white-label.js --example    # Generate example tenant JSON
node scripts/white-label.js tenant.json   # Apply tenant config
```

## Deployment

### Vercel (Frontend)
Push to `main` branch triggers automatic deployment.

### Firebase (Backend)
```bash
npx firebase deploy --only firestore:rules
```

## Documentation

| Document | Description |
|----------|-------------|
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Full technical documentation, data models, security, API reference |
| [CLAUDE.md](./CLAUDE.md) | AI assistant instructions & coding conventions |

## License

Proprietary - All rights reserved.

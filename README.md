# KeyHub Central

A Progressive Web App (PWA) for managing three interconnected businesses under one unified platform.

## Business Units

- **Keynote Digital (KD)** - Lead generation, ad campaigns & marketing subscriptions
- **Key Trade Solutions (KTS)** - 1099 contractor network (installers, sales reps, PMs, service techs)
- **Key Renovations (KR)** - D2C home renovation sales & project management

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router, PWA) |
| Language | TypeScript (strict mode) |
| Styling | Tailwind CSS |
| Hosting | Vercel |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Backend | Firebase Cloud Functions |
| Calendar | Google Calendar API (2-way sync) |
| Email | Gmail API, Nodemailer |
| SMS | Twilio |
| Voice | VAPI |
| AI | Anthropic Claude SDK |
| PDF | @react-pdf/renderer |
| Charts | Recharts |
| Testing | Jest, Playwright |
| Validation | Zod |

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
# Fill in your Firebase credentials and API keys (see DOCUMENTATION.md for full list)

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
| `npm run test` | Run Jest unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run E2E tests with UI |
| `npm run firebase:emulators` | Start Firebase local emulators |
| `npm run firebase:deploy` | Deploy Firestore rules & Cloud Functions |

## Project Structure

```
keyhub-central/
├── app/
│   ├── (auth)/                 # Auth pages (login, signup, pending, forgot-password)
│   ├── (dashboard)/            # Protected routes
│   │   ├── overview/           # Main dashboard
│   │   ├── kts/                # Key Trade Solutions (contractors, availability, inventory)
│   │   ├── kr/                 # Key Renovations (jobs, pipeline, contracts)
│   │   ├── kd/                 # Keynote Digital (leads, campaigns, subscribers)
│   │   ├── financials/         # Invoices, P&L, payouts, expenses
│   │   ├── admin/              # User management, partners, seeding
│   │   ├── subscriber/         # Subscriber portal (leads, subscription)
│   │   └── settings/           # User settings, calendar, notifications
│   ├── portal/                 # Contractor portal (jobs, earnings, inventory)
│   ├── partner/                # Partner portal (labor requests, service tickets)
│   ├── api/                    # API routes (webhooks, integrations, admin)
│   ├── lead-generator/         # Public lead capture (event QR codes)
│   ├── rate/                   # Public customer rating page
│   └── legal/                  # Legal pages (privacy, SMS terms)
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── forms/                  # Form components
│   ├── charts/                 # Dashboard visualizations
│   └── navigation/             # Nav components
├── lib/
│   ├── firebase/               # Firebase CRUD helpers (30+ modules)
│   ├── hooks/                  # Custom React hooks (30+ hooks)
│   ├── utils/                  # Utility functions
│   ├── auth/                   # Auth verification, webhook signatures
│   ├── contexts/               # React contexts (Sidebar, etc.)
│   ├── sms/                    # SMS provider, AI responses
│   ├── vapi/                   # Voice call client & types
│   └── env.ts                  # Environment variable validation (Zod)
├── types/                      # TypeScript interfaces
├── functions/
│   └── src/
│       ├── triggers/           # Firestore triggers (invoices, leads, notifications, etc.)
│       ├── scheduled/          # Cron jobs (calendar sync, sheets sync)
│       ├── lib/                # Shared Cloud Function utilities
│       └── index.ts            # Function exports
├── __tests__/                  # Jest unit tests
├── e2e/                        # Playwright E2E tests
├── firestore.rules             # Firestore security rules
├── storage.rules               # Storage security rules
└── public/                     # Static assets & PWA manifest
```

## Features

### Implemented
- Role-based authentication with pending approval flow (7 roles)
- Contractor management with onboarding wizard
- Job pipeline (Kanban) with 8-stage workflow
- Lead management with auto-assignment by territory/rating
- Invoice management with PDF generation
- P&L tracking per entity and combined
- Google Calendar 2-way sync
- Push notifications (FCM) with per-category preferences
- Contractor portal (jobs, earnings, availability, inventory)
- Partner portal (labor requests, service tickets)
- Subscriber portal (leads, subscription management)
- Inventory management with receipt AI parsing
- Contract signing with digital signatures
- Customer rating system (public token-based)
- SMS conversations (Twilio) with AI responses
- Voice calls (VAPI) with inbound capture
- Facebook/Meta lead ads webhook integration
- Event lead capture with QR codes
- Expense tracking with Google Sheets export
- Payout tracking for contractors
- AI chat assistant (Claude)

### Planned
- Stripe payment processing
- Checkr background check integration
- TaxBandits W-9 automation
- Indeed/ZipRecruiter job posting
- White-label platform licensing
- AI lead scoring
- Auto-scheduling optimization

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
| `subscriber` | KD leads portal only |
| `partner` | Partner portal (labor requests, tickets) |

## Security

- Firebase Authentication with custom claims
- Firestore security rules with role-based access control
- Storage rules with file type/size validation
- Webhook signature verification (Twilio, VAPI, Facebook)
- Environment variable validation via Zod
- Server-side only API keys (no client exposure)
- Field-level write protection in Firestore rules

See [DOCUMENTATION.md](./DOCUMENTATION.md) Section 4 for full security details.

## Deployment

### Vercel (Frontend)
Push to `main` branch triggers automatic deployment.

### Firebase (Backend)
```bash
npm run firebase:deploy
```

## Documentation

| Document | Description |
|----------|-------------|
| [DOCUMENTATION.md](./DOCUMENTATION.md) | Full technical documentation, data models, security, API reference |
| [CLAUDE.md](./CLAUDE.md) | AI assistant instructions & coding conventions |

## License

Proprietary - All rights reserved.

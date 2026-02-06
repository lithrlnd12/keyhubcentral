# CLAUDE.md - KeyHub Central

## Project Overview

KeyHub Central is a PWA for managing three interconnected businesses:
- **Keynote Digital (KD)** — Lead generation & marketing subscriptions
- **Key Trade Solutions (KTS)** — 1099 contractor network (installers, sales reps, PMs, service techs)
- **Key Renovations (KR)** — D2C home renovation sales

See `DOCUMENTATION.md` for full technical documentation, data models, security, and module specs.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14+ (App Router, PWA) |
| Hosting | Vercel |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage + Google Drive API |
| Backend | Firebase Cloud Functions |
| Calendar | Google Calendar API (2-way sync) |
| Email | Gmail API |
| AI | Claude Sonnet 4.5 (future) |

## Commands

```bash
# Development
npm run dev           # Start dev server (localhost:3000)
npm run build         # Production build
npm run lint          # ESLint

# Firebase
npm run firebase:emulators   # Local Firebase emulators
npm run firebase:deploy      # Deploy Firestore rules + functions

# Deployment
git push origin main  # Auto-deploys to Vercel
```

## Project Structure

```
keyhub-central/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth pages (login, signup, pending)
│   ├── (dashboard)/        # Protected routes
│   │   ├── overview/       # Main dashboard
│   │   ├── kts/            # Key Trade Solutions module
│   │   ├── kr/             # Key Renovations module
│   │   ├── kd/             # Keynote Digital module
│   │   ├── financials/     # Invoices, P&L
│   │   └── admin/          # User management, settings
│   ├── portal/             # Contractor portal (limited access)
│   └── layout.tsx
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── forms/              # Form components
│   └── charts/             # Dashboard visualizations
├── lib/
│   ├── firebase/           # Firebase config & helpers
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Utility functions
├── types/                  # TypeScript interfaces
├── functions/              # Firebase Cloud Functions
├── public/
│   └── manifest.json       # PWA manifest
├── PRD.md                  # Full product requirements
└── CLAUDE.md               # This file
```

## Key Patterns

### Authentication & Roles

Users sign up → land in `pending` status → Admin approves & assigns role.

**Roles:** `owner`, `admin`, `sales_rep`, `contractor`, `pm`, `subscriber`

```typescript
// Check role in components
const { user, role } = useAuth();
if (!['owner', 'admin'].includes(role)) redirect('/unauthorized');
```

### Firestore Collections

Primary collections: `users`, `contractors`, `jobs`, `leads`, `invoices`, `campaigns`, `subscriptions`, `serviceTickets`, `partners`, `laborRequests`, `partnerServiceTickets`, `inventoryItems`, `inventoryLocations`, `inventoryStock`, `inventoryCounts`, `receipts`, `expenses`, `notifications`, `ratingRequests`, `payouts`, `smsConversations`, `voiceCalls`, `inboundCalls`, `contracts`

See `DOCUMENTATION.md` → Data Models section for full schemas.

### File Uploads

- W-9, insurance docs → Firebase Storage (`/contractors/{uid}/documents/`)
- Job photos → Firebase Storage (`/jobs/{jobId}/photos/`)
- Large files / Drive integration → Google Drive API

### Mobile-First

- Desktop: Side navigation
- Mobile: Bottom tab navigation
- All components must be touch-friendly and responsive

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
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server-side (for Cloud Functions)
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=
```

## Current Phase

**Phase 1: Foundation** — Setting up PWA shell, Firebase, and role-based auth.

Next steps:
1. Initialize Next.js with PWA config
2. Set up Firebase project
3. Implement auth with pending approval flow
4. Build app shell with responsive navigation

## Quick Reference

| Need | Location |
|------|----------|
| Full technical docs | `DOCUMENTATION.md` |
| Data models | `DOCUMENTATION.md` → Section 5 |
| Role permissions | `DOCUMENTATION.md` → Section 3 |
| Security details | `DOCUMENTATION.md` → Section 4 |
| API routes | `DOCUMENTATION.md` → Section 11 |
| Job stages | Lead → Sold → Front End Hold → Production → Scheduled → Started → Complete → Paid in Full |
| Subscription tiers | Starter ($399), Growth ($899), Pro ($1,499+) |
| Commission rates | Elite 10%, Pro 9%, Standard 8% |

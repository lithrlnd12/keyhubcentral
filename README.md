# KeyHub Central

A Progressive Web App (PWA) for managing three interconnected businesses under one unified platform.

## Business Units

- **Keynote Digital (KD)** — Lead generation & marketing subscriptions
- **Key Trade Solutions (KTS)** — 1099 contractor network (installers, sales reps, PMs, service techs)
- **Key Renovations (KR)** — D2C home renovation sales

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router, PWA) |
| Styling | Tailwind CSS |
| Hosting | Vercel |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Backend | Firebase Cloud Functions |
| Testing | Jest, Playwright |

## Prerequisites

- Node.js 18+
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore, Auth, and Storage enabled

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-org/keyhub-central.git
cd keyhub-central
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example environment file and fill in your Firebase credentials:

```bash
cp .env.local.example .env.local
```

Required variables:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. Run the development server

```bash
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
| `npm run firebase:deploy` | Deploy Firestore rules & functions |

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
│   └── layout.tsx
├── components/
│   ├── ui/                 # Reusable UI components
│   ├── forms/              # Form components
│   └── navigation/         # Nav components
├── lib/
│   ├── firebase/           # Firebase config & helpers
│   ├── hooks/              # Custom React hooks
│   └── utils/              # Utility functions
├── types/                  # TypeScript interfaces
├── functions/              # Firebase Cloud Functions
├── __tests__/              # Jest unit tests
├── e2e/                    # Playwright E2E tests
└── public/                 # Static assets & PWA manifest
```

## Authentication

Users follow this flow:
1. **Sign up** → Account created with `pending` status
2. **Pending approval** → Admin reviews and approves
3. **Active** → Full access based on assigned role

### Roles

| Role | Access |
|------|--------|
| `owner` | Full system access |
| `admin` | User management, all modules |
| `sales_rep` | KR jobs, leads, own performance |
| `contractor` | Contractor portal, assigned jobs |
| `pm` | Job management, crew assignment |
| `subscriber` | KD leads portal only |

## Deployment

### Vercel (Frontend)

Push to `main` branch triggers automatic deployment:

```bash
git push origin main
```

### Firebase (Backend)

Deploy Firestore rules and Cloud Functions:

```bash
npm run firebase:deploy
```

## Documentation

| Document | Description |
|----------|-------------|
| [PRD.md](./PRD.md) | Full product requirements & data models |
| [CLAUDE.md](./CLAUDE.md) | AI assistant instructions & conventions |

## License

Proprietary - All rights reserved.

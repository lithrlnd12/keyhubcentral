# KeyHub Central — Product Requirements Document

## Overview

**Product Name:** KeyHub Central  
**Version:** 1.0  
**Last Updated:** December 19, 2025  
**Owner:** Zach Rhyne  
**Status:** Planning

---

## Executive Summary

KeyHub Central is a Progressive Web App (PWA) designed to manage three interconnected businesses and their operational, financial, and lead-flow interactions:

| Company | Role | Function |
|---------|------|----------|
| **Keynote Digital (KD)** | Marketing Engine | Lead generation, ad campaigns, contractor subscriptions |
| **Key Trade Solutions (KTS)** | Labor Engine | 1099 contractors, sales reps, service techs, PMs |
| **Key Renovations (KR)** | D2C Engine | Homeowner renovation sales and project management |

The platform visualizes and manages the revenue flywheel between all three entities while providing role-based access for owners, admins, contractors, and staff.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js (PWA) |
| **Hosting** | Vercel |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Authentication |
| **File Storage** | Firebase Storage + Google Drive API |
| **Backend** | Firebase Cloud Functions |
| **Calendar** | Google Calendar API (2-way sync) |
| **Email** | Gmail API (auto-invoicing) |
| **AI** | Claude Sonnet 4.5 (future features) |
| **Repo** | GitHub |
| **Domain** | Vercel free domain (temporary) |

---

## Business Context

### Revenue Flow Model

```
┌─────────────────────────────────────────────────────────────┐
│                    REVENUE FLYWHEEL                         │
└─────────────────────────────────────────────────────────────┘

    Keynote Digital ──── generates leads ────► Key Renovations
          ▲                                          │
          │                                          ▼
          │                                    sells jobs
          │                                          │
          │                                          ▼
    contractors                              Key Trade Solutions
    buy marketing ◄──── provides labor ─────────────┘
```

### Intercompany Pricing

| Flow | Description | Rate |
|------|-------------|------|
| KD → KR | Internal leads | $35–$95 (20% below market) |
| KTS → KR | Labor day rates | $250–$500/day |
| KTS → KR | Sales commissions | 8–10% of job value |
| External → KD | Subscriptions | $399–$1,499/month |
| External → KD | Pay-per-lead | $50–$250/lead |

### Internal Discount Policy
- 20% off market rates for intercompany transactions
- Net 30 payment terms

---

## User Roles & Permissions

### Role Definitions

| Role | Description | Access Level |
|------|-------------|--------------|
| **Owner** | Zach — Full system access | All modules, all data, all actions |
| **Admin** | Jaime — Operations & accounting | All modules, approve users, financials |
| **Sales Rep** | 1099 sales contractors | Assigned leads, job progress on their sales, commissions |
| **Contractor** | 1099 installers/techs | Assigned jobs, availability, earnings |
| **Project Manager** | Job oversight | Assigned jobs, crew management, mark complete |
| **Sales Manager** | Sales team lead (future) | All sales reps, territories, performance |
| **Subscriber** | External contractors buying leads | Lead portal, subscription management |

### Authentication Flow

```
User Signs Up
      │
      ▼
┌─────────────────┐
│ Pending Approval │  ◄── Lands here by default
└────────┬────────┘
         │
         ▼
   Admin Reviews
         │
    ┌────┴────┐
    ▼         ▼
 Approve    Reject
    │         │
    ▼         ▼
Assign Role  Notify & 
    │        Archive
    ▼
User Activated
```

### Permission Matrix

| Feature | Owner | Admin | Sales Rep | Contractor | PM | Subscriber |
|---------|-------|-------|-----------|------------|-------|------------|
| Dashboard Overview | ✅ | ✅ | Limited | Limited | Limited | ❌ |
| KR - All Jobs | ✅ | ✅ | ❌ | ❌ | Assigned | ❌ |
| KR - Job Progress (own sales) | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| KTS - All Contractors | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| KTS - Own Profile | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| KTS - Availability | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| KD - Campaigns | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| KD - All Leads | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| KD - Assigned Leads | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Financials - Full P&L | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Financials - Own Earnings | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve Users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Assign Roles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Module Specifications

### Module 1: Key Trade Solutions (KTS)

#### 1.1 Contractor Management

**Contractor Profile Fields:**
- Full name
- Business name (if applicable)
- Email
- Phone
- Address (used for territory radius)
- Trade(s): Installer, Sales Rep, Service Tech, PM, Admin
- Skills/certifications
- License numbers
- Insurance info (carrier, policy #, expiration)
- W-9 (uploaded to Firebase Storage)
- ACH info (for payments)
- Status: Pending, Active, Inactive, Suspended
- Date onboarded
- Notes

**Contractor List Features:**
- Master list view
- Filter by: trade, skills, location, status, availability
- Search by name, phone, email
- Individual contractor folders/detail pages
- Performance ratings display
- Quick actions: Assign job, View calendar, Message

#### 1.2 Performance Rating System

**Rating Formula:**
```
Overall Score = (Customer Rating × 0.40) + (Speed Score × 0.20) + (Warranty Score × 0.20) + (Internal Eval × 0.20)
```

| Component | Weight | Source |
|-----------|--------|--------|
| Customer Rating | 40% | Post-job customer surveys (1-5 stars) |
| Speed Score | 20% | On-time completion rate |
| Warranty Score | 20% | Inverse of warranty callback rate |
| Internal Evaluation | 20% | Manual rating by Owner/Admin/PM |

**Rating Tiers:**
- ⭐⭐⭐⭐⭐ Elite (4.5+) — Priority assignments, 10% commission
- ⭐⭐⭐⭐ Pro (3.5–4.4) — Standard assignments, 9% commission
- ⭐⭐⭐ Standard (2.5–3.4) — 8% commission
- ⭐⭐ Needs Improvement (1.5–2.4) — Review required
- ⭐ Probation (<1.5) — Suspension pending review

#### 1.3 Sales Rep Territories

**Territory Definition:**
- Based on radius from sales rep's home address
- Default radius: 25 miles (adjustable per rep)
- Overlap handling: Assign to highest-rated available rep

**Lead Assignment Logic:**
```
1. New lead comes in with address
2. System finds all reps whose territory covers lead address
3. Filter by availability (not at capacity)
4. Sort by performance rating (highest first)
5. Assign to top available rep
6. If no rep available → Queue for manual assignment
```

**Capacity Settings:**
- Max concurrent leads per rep (default: 10, adjustable)
- When at capacity, lead goes to next best rep

#### 1.4 Availability & Scheduling

**Google Calendar Integration:**
- 2-way sync with contractor's Google Calendar
- Contractor updates availability in app → syncs to their calendar
- Contractor blocks time in Google Calendar → reflects in app
- Job assignments create calendar events (manual for now, auto later)

**Availability States:**
- Available
- Busy (has job)
- Unavailable (personal)
- On Leave

#### 1.5 Contractor Portal

**Contractor Dashboard Shows:**
- My assigned jobs (current + upcoming)
- My assigned leads (for sales reps)
- My earnings summary (MTD, YTD)
- Payment history
- My performance rating
- My availability calendar
- Upload completion photos/docs (→ Firebase Storage or Google Drive)

#### 1.6 Contractor Onboarding Flow

**Step 1: Basic Information**
- Name, email, phone, address
- Trade selection
- Skills/certifications

**Step 2: Documents**
- Upload W-9
- Upload insurance certificate
- Enter license numbers
- ACH banking info

**Step 3: Service Area**
- Set home base address
- Define service radius (for sales reps)
- Select available markets

**Step 4: Review & Submit**
- Review all entered info
- Accept vendor agreement (Service Tech Vendor Agreement)
- Submit for approval

**Post-Approval:**
- Welcome email sent
- Account activated
- After 15–30 days: Keynote Digital upsell pitch
- Offer: 50% off first month of lead subscription (ad spend still mandatory)

---

### Module 2: Key Renovations (KR)

#### 2.1 Job Management

**Job Record Fields:**
- Job number (auto-generated)
- Customer name
- Customer phone
- Customer email
- Job address
- Job type: Bathroom, Kitchen, Exterior, Other
- Status (see pipeline below)
- Sales rep (from KTS)
- Assigned crew/installer (from KTS)
- Project manager (from KTS)
- Material costs (estimated vs actual)
- Labor costs (estimated vs actual)
- Total projected cost
- Total actual cost
- Profit margin (calculated)
- Timeline: Start date, Target completion, Actual completion
- Communication log
- Notes
- Warranty info
- Service history

**Job Search:**
- Search by: Job number, customer name, address, phone
- Filter by: Status, job type, date range, assigned rep, assigned crew

#### 2.2 Job Pipeline (Kanban)

**Stages:**
```
Lead → Sold → Front End Hold → Production → Scheduled → Started → Complete → Paid in Full
```

| Stage | Description | Actions Available |
|-------|-------------|-------------------|
| Lead | New inquiry from KD | Convert to Sold, Archive |
| Sold | Contract signed | Move to Front End Hold |
| Front End Hold | Awaiting materials/permits | Move to Production |
| Production | Materials ordered/prep | Move to Scheduled |
| Scheduled | Install date set | Move to Started |
| Started | Work in progress | Move to Complete |
| Complete | Work finished, pending payment | Mark Paid in Full |
| Paid in Full | Closed, in warranty period | — |

**Who Can Update Status:**
- Lead → Sold: Sales Rep, Admin, Owner
- All other transitions: PM, Admin, Owner

#### 2.3 Cost Tracking

**Cost Categories:**
```
┌─────────────────────────────────────────┐
│           JOB COST SUMMARY              │
├─────────────────────────────────────────┤
│ Material Cost (Projected):    $X,XXX    │
│ Material Cost (Actual):       $X,XXX    │
│ Variance:                     $XXX      │
├─────────────────────────────────────────┤
│ Labor Cost (Projected):       $X,XXX    │
│ Labor Cost (Actual):          $X,XXX    │
│ Variance:                     $XXX      │
├─────────────────────────────────────────┤
│ Total Projected:              $XX,XXX   │
│ Total Actual:                 $XX,XXX   │
│ Profit Margin:                XX%       │
└─────────────────────────────────────────┘
```

#### 2.4 Communication Log

**Per-Job Log Entries:**
- Timestamp
- User who logged
- Type: Call, Email, Text, Note, Status Update
- Content
- Attachments (optional)

**Auto-logged Events:**
- Status changes
- Crew assignments
- Payment received

#### 2.5 Warranty & Service

**Per-Job Tabs:**
- **Details** — Main job info
- **Costs** — Material/labor tracking
- **Timeline** — Milestones and dates
- **Communication** — Log entries
- **Warranty & Service** — Service tickets for this job

**Warranty Tracking:**
- Warranty start date (job completion date)
- Warranty end date (1 year from completion)
- Service tickets linked to job
- Warranty status: Active, Expired

**Service Ticket Fields:**
- Ticket number
- Linked job number
- Customer info (pulled from job)
- Issue description
- Photos (before)
- Assigned service tech
- Status: New, Assigned, Scheduled, In Progress, Complete
- Resolution notes
- Photos (after)
- Date created
- Date resolved

---

### Module 3: Keynote Digital (KD)

#### 3.1 Lead Management

**Lead Record Fields:**
- Lead ID (auto-generated)
- Source: Google Ads, Meta, TikTok, Event, Referral, Other
- Campaign name
- Market/region
- Trade type: Bath, Kitchen, Roofing, Windows, etc.
- Customer name
- Phone
- Email
- Address
- Lead quality tier: Hot, Warm, Cold
- Status: New, Assigned, Contacted, Qualified, Converted, Lost, Returned
- Assigned to (Sales Rep or Subscriber)
- Date created
- Notes

**Lead Search & Filter:**
- Search by: Name, phone, email, address
- Filter by: Source, campaign, market, trade, quality, status, date range

#### 3.2 Lead Routing

**Internal Leads (to Key Renovations):**
- Homeowner leads automatically route to KR pipeline
- Assigned to sales rep based on territory + performance

**External Leads (to Subscribers):**
- Contractor leads route to subscriber based on:
  - Subscription tier
  - Geographic coverage
  - Trade match
  - Lead volume cap

#### 3.3 Lead Return Policy

**Valid Return Reasons:**
- Wrong contact info
- Outside service area
- Not a real inquiry

**Return Rules:**
- Must request within 24 hours of receiving lead
- No refund — lead is replaced
- Replacement lead delivered within 48 hours

#### 3.4 Campaign Tracking

**Campaign Record Fields:**
- Campaign name
- Platform: Google Ads, Meta, TikTok, Event, Other
- Market/region
- Trade type
- Start date
- End date (if applicable)
- Total spend
- Total leads generated
- Cost per lead (calculated)
- Conversion rate
- Revenue attributed
- ROI (calculated)

**Campaign Analytics:**
- Performance by platform
- Performance by market
- Performance by trade
- Spend vs ROI trends

#### 3.5 Subscriber Management (External Contractors)

**Subscription Tiers:**

| Tier | Monthly Fee | Lead Volume | Min Ad Spend | Lead Type |
|------|-------------|-------------|--------------|-----------|
| Starter | $399 | 10–15/month | $600 | Exclusive |
| Growth | $899 | 15–25/month | $900 | Exclusive |
| Pro | $1,499+ | Flexible | $1,500+ | Exclusive |

**Subscriber Portal Features:**
- View assigned leads
- Lead details + contact info
- Return lead (within 24 hrs)
- Subscription status
- Billing history
- Lead performance stats

**Subscriber Onboarding:**
- Sign up → Select tier → Payment setup → Approval
- After approval: Access to lead portal
- Push notifications for new leads

---

### Module 4: Financials

#### 4.1 Invoice Management

**Invoice Types:**
- KD → KR (lead fees)
- KTS → KR (labor + commissions)
- KR → Customer (job payments)
- KD → Subscriber (subscription + ad spend)

**Invoice Fields:**
- Invoice number (auto-generated)
- From entity
- To entity/customer
- Line items (description, qty, rate, total)
- Subtotal
- Discounts (20% internal if applicable)
- Total
- Status: Draft, Sent, Paid, Overdue
- Due date (Net 30)
- Date sent
- Date paid
- Payment method

**Auto-Invoice Triggers:**
- Job marked "Paid in Full" → Generate KTS invoice for labor/commission
- Lead assigned to KR → Generate KD invoice for lead fee
- Monthly subscription cycle → Generate KD invoice to subscriber

**Gmail Integration:**
- Auto-send invoices via Gmail API
- Track email open/click (if possible)

#### 4.2 P&L Tracking

**Per-Entity P&L:**
- Revenue (by category)
- Expenses (by category)
- Net income
- Monthly/quarterly/annual views

**Combined P&L:**
- All three entities consolidated
- Intercompany transactions netted out
- Overall business health view

#### 4.3 Overdue Management

- Invoices flagged overdue after Net 30
- Dashboard alert for overdue invoices
- Ability to send reminder emails

#### 4.4 Contractor Payments

**Earnings Dashboard (Contractor View):**
- Jobs completed
- Hours/days worked
- Commission earned (for sales reps)
- Total earned (MTD, YTD)
- Payment history
- Pending payments

---

### Module 5: Dashboard & Analytics

#### 5.1 Overview Dashboard

**Stat Cards:**
- KD: Leads generated (MTD), Revenue, CPL
- KTS: Active contractors, Jobs completed, Revenue
- KR: Active jobs, Revenue, Avg profit margin
- Combined: Total revenue, Total profit

**Charts:**
- Revenue trend (line chart, 12 months)
- Leads by source (pie chart)
- Jobs by type (bar chart)
- Contractor utilization (bar chart)

**Quick Actions:**
- New Lead
- Create Invoice
- Assign Crew
- Approve User

#### 5.2 Business Flow Visualization

Interactive diagram showing:
- Lead flow: KD → KR
- Labor flow: KTS → KR
- Money flow: KR → KD, KR → KTS, Subscribers → KD
- Contractor loop: KTS ↔ KD

---

## PWA Requirements

### Core PWA Features

- **Installable:** Add to home screen on iOS, Android, Desktop
- **Offline Support:** Cache critical screens, show offline indicator
- **Responsive:** Works on mobile, tablet, desktop
- **Push Notifications:** New leads, job updates, payment received, user approval needed

### Mobile-First Screens

| Screen | Priority Actions |
|--------|-----------------|
| Dashboard | View stats, quick actions |
| Leads | View new, assign rep |
| Jobs | Check status, update stage |
| Contractors | View availability, assign |
| My Portal (Contractor) | See assignments, update availability, view earnings |
| Invoices | Approve, send |

### Navigation

**Desktop:** Side navigation  
**Mobile:** Bottom tab navigation

---

## Data Models (Firestore Collections)

### Users
```javascript
users/{userId}
{
  uid: string,
  email: string,
  displayName: string,
  phone: string,
  role: 'owner' | 'admin' | 'sales_rep' | 'contractor' | 'pm' | 'subscriber',
  status: 'pending' | 'active' | 'inactive' | 'suspended',
  createdAt: timestamp,
  approvedAt: timestamp,
  approvedBy: string (userId)
}
```

### Contractors (extends user profile)
```javascript
contractors/{odId}
{
  userId: string,
  businessName: string,
  address: {street, city, state, zip, lat, lng},
  trades: ['installer', 'sales_rep', 'service_tech', 'pm'],
  skills: [string],
  licenses: [{type, number, state, expiration}],
  insurance: {carrier, policyNumber, expiration, certificateUrl},
  w9Url: string,
  achInfo: {bankName, routingNumber, accountNumber}, // encrypted
  serviceRadius: number (miles),
  rating: {overall, customer, speed, warranty, internal},
  status: string,
  createdAt: timestamp
}
```

### Jobs
```javascript
jobs/{jobId}
{
  jobNumber: string,
  customer: {name, phone, email, address},
  type: 'bathroom' | 'kitchen' | 'exterior' | 'other',
  status: 'lead' | 'sold' | 'front_end_hold' | 'production' | 'scheduled' | 'started' | 'complete' | 'paid_in_full',
  salesRepId: string,
  crewIds: [string],
  pmId: string,
  costs: {
    materialProjected: number,
    materialActual: number,
    laborProjected: number,
    laborActual: number
  },
  dates: {
    created: timestamp,
    sold: timestamp,
    scheduledStart: timestamp,
    actualStart: timestamp,
    targetCompletion: timestamp,
    actualCompletion: timestamp,
    paidInFull: timestamp
  },
  warranty: {startDate, endDate, status},
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Job Communications
```javascript
jobs/{jobId}/communications/{commId}
{
  type: 'call' | 'email' | 'text' | 'note' | 'status_update',
  userId: string,
  content: string,
  attachments: [string],
  createdAt: timestamp
}
```

### Service Tickets
```javascript
serviceTickets/{ticketId}
{
  ticketNumber: string,
  jobId: string,
  customer: {name, phone, email, address},
  issue: string,
  photosBefore: [string],
  photosAfter: [string],
  assignedTechId: string,
  status: 'new' | 'assigned' | 'scheduled' | 'in_progress' | 'complete',
  resolution: string,
  createdAt: timestamp,
  resolvedAt: timestamp
}
```

### Leads
```javascript
leads/{leadId}
{
  source: 'google_ads' | 'meta' | 'tiktok' | 'event' | 'referral' | 'other',
  campaignId: string,
  market: string,
  trade: string,
  customer: {name, phone, email, address},
  quality: 'hot' | 'warm' | 'cold',
  status: 'new' | 'assigned' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'returned',
  assignedTo: string (userId),
  assignedType: 'internal' | 'subscriber',
  returnReason: string,
  returnedAt: timestamp,
  createdAt: timestamp
}
```

### Campaigns
```javascript
campaigns/{campaignId}
{
  name: string,
  platform: 'google_ads' | 'meta' | 'tiktok' | 'event' | 'other',
  market: string,
  trade: string,
  startDate: timestamp,
  endDate: timestamp,
  spend: number,
  leadsGenerated: number,
  createdAt: timestamp
}
```

### Subscriptions
```javascript
subscriptions/{subscriptionId}
{
  userId: string,
  tier: 'starter' | 'growth' | 'pro',
  monthlyFee: number,
  adSpendMin: number,
  leadCap: number,
  status: 'active' | 'paused' | 'cancelled',
  startDate: timestamp,
  billingCycle: timestamp
}
```

### Invoices
```javascript
invoices/{invoiceId}
{
  invoiceNumber: string,
  from: {entity: string, name: string},
  to: {entity: string, name: string, email: string},
  lineItems: [{description, qty, rate, total}],
  subtotal: number,
  discount: number,
  total: number,
  status: 'draft' | 'sent' | 'paid' | 'overdue',
  dueDate: timestamp,
  sentAt: timestamp,
  paidAt: timestamp,
  createdAt: timestamp
}
```

---

## Development Phases

### Phase 1: Foundation (Weeks 1–2)
**Goal:** Core infrastructure + auth system

- [ ] Initialize Next.js project with PWA config
- [ ] Set up Firebase (Auth, Firestore, Storage)
- [ ] Configure Vercel deployment
- [ ] Set up GitHub repo + CI/CD
- [ ] Implement role-based authentication
- [ ] Build user signup → pending approval flow
- [ ] Create admin user management screen
- [ ] Build app shell with navigation (responsive)

**Deliverable:** Working PWA with login, role-based routing, user approval system

### Phase 2: Key Trade Solutions (Weeks 3–5)
**Goal:** Contractor management foundation

- [ ] Contractor data model + CRUD
- [ ] Contractor list view with filters
- [ ] Contractor detail/profile page
- [ ] Contractor onboarding wizard (4 steps)
- [ ] File upload to Firebase Storage (W-9, insurance)
- [ ] Performance rating system
- [ ] Google Calendar API integration (2-way sync)
- [ ] Contractor portal (my jobs, my earnings, availability)
- [ ] Sales rep territory configuration

**Deliverable:** Full contractor management + self-service portal

### Phase 3: Key Renovations (Weeks 6–8)
**Goal:** Job pipeline management

- [ ] Job data model + CRUD
- [ ] Job list view with search/filters
- [ ] Kanban pipeline view
- [ ] Job detail page with tabs (Details, Costs, Timeline, Communication, Warranty)
- [ ] Cost tracking (projected vs actual)
- [ ] Communication log
- [ ] Service ticket system
- [ ] Warranty tracking
- [ ] Crew assignment from KTS
- [ ] Status update permissions

**Deliverable:** Complete job management system

### Phase 4: Keynote Digital (Weeks 9–11)
**Goal:** Lead + subscription management

- [ ] Lead data model + CRUD
- [ ] Lead list with filters
- [ ] Lead detail view
- [ ] Campaign tracking
- [ ] Lead routing logic (internal + subscriber)
- [ ] Lead return workflow (24hr rule)
- [ ] Subscriber data model
- [ ] Subscription tier management
- [ ] Subscriber portal (view leads, return leads)
- [ ] Campaign analytics dashboard

**Deliverable:** Lead management + external subscriber system

### Phase 5: Financials (Weeks 12–14)
**Goal:** Invoicing + P&L

- [ ] Invoice data model + CRUD
- [ ] Invoice generation (manual + auto-triggers)
- [ ] Gmail API integration for sending
- [ ] Invoice status tracking
- [ ] Overdue alerts
- [ ] P&L by entity
- [ ] Combined P&L view
- [ ] Contractor earnings/payment history
- [ ] Intercompany transaction tracking

**Deliverable:** Complete financial management

### Phase 6: Polish & AI (Weeks 15–16)
**Goal:** Refinement + intelligent features

- [ ] Push notification system
- [ ] Dashboard analytics refinements
- [ ] Business flow visualization
- [ ] Performance optimizations
- [ ] AI feature planning (Claude Sonnet 4.5 integration points)
- [ ] User testing + feedback
- [ ] Bug fixes

**Deliverable:** Production-ready v1.0

---

## Future Enhancements (Post-MVP)

- [ ] Auto-scheduling: Job assignments create calendar events automatically
- [ ] AI lead scoring: Claude Sonnet 4.5 predicts lead quality
- [ ] AI scheduling optimization: Suggests best crew for job based on location, skills, availability
- [ ] AI communication drafts: Generate follow-up emails/texts
- [ ] Franchise system: White-label for expansion
- [ ] Advanced reporting: Custom report builder
- [ ] Integrations: QuickBooks, Zapier, etc.
- [ ] Customer portal: Homeowners check job status

---

## Success Metrics

| Metric | Target |
|--------|--------|
| User adoption | All contractors onboarded within 30 days |
| Job tracking | 100% of jobs in system |
| Invoice automation | 90% of invoices auto-generated |
| Lead response time | < 1 hour for new leads |
| Mobile usage | 60%+ of contractor access via mobile |

---

## Appendix

### A. Service Tech Vendor Agreement
See separate document: `Service_Tech_Vendor_Agreement.pdf`

### B. Subscription Tier Details
| Tier | Fee | Leads | Ad Spend | Exclusivity |
|------|-----|-------|----------|-------------|
| Starter | $399/mo | 10–15 | $600 min | Exclusive |
| Growth | $899/mo | 15–25 | $900 min | Exclusive |
| Pro | $1,499+/mo | Flexible | $1,500 min | Exclusive |

### C. Commission Structure
| Performance Tier | Rating | Commission |
|------------------|--------|------------|
| Elite | 4.5+ | 10% |
| Pro | 3.5–4.4 | 9% |
| Standard | 2.5–3.4 | 8% |

---

*Document version 1.0 — Ready for development*

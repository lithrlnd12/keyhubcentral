# KeyHub Central - Technical Documentation

**Version:** 3.0
**Last Updated:** March 27, 2026
**Status:** Active Development

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Tech Stack](#2-tech-stack)
3. [Authentication & Authorization](#3-authentication--authorization)
4. [Security](#4-security)
5. [Data Models](#5-data-models)
6. [Module Specifications](#6-module-specifications)
7. [Cloud Functions](#7-cloud-functions)
8. [Notifications System](#8-notifications-system)
9. [Integrations](#9-integrations)
10. [Business Logic](#10-business-logic)
11. [API Routes](#11-api-routes)
12. [Testing](#12-testing)
13. [Deployment](#13-deployment)
14. [Environment Variables](#14-environment-variables)

---

## 1. Architecture Overview

KeyHub Central is a Progressive Web App (PWA) managing three interconnected businesses under one unified platform:

| Company | Role | Function |
|---------|------|----------|
| **Keynote Digital (KD)** | Marketing Engine | Lead generation, ad campaigns, contractor subscriptions |
| **Key Trade Solutions (KTS)** | Labor Engine | 1099 contractors, sales reps, service techs, PMs |
| **Key Renovations (KR)** | D2C Engine | Homeowner renovation sales and project management |

### Revenue Flow Model

```
Keynote Digital ---- generates leads ----> Key Renovations
      ^                                          |
      |                                    sells jobs
      |                                          |
      |                                          v
contractors                              Key Trade Solutions
buy marketing <---- provides labor --------------+
```

### Intercompany Pricing

| Flow | Description | Rate |
|------|-------------|------|
| KD -> KR | Internal leads | $35-$95 (20% below market) |
| KTS -> KR | Labor day rates | $250-$500/day |
| KTS -> KR | Sales commissions | 8-10% of job value |
| External -> KD | Subscriptions | $399-$1,499/month |
| External -> KD | Pay-per-lead | $50-$250/lead |

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js (App Router, PWA) | 14.x |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 3.x |
| **Hosting** | Vercel | - |
| **Database** | Firebase Firestore | - |
| **Auth** | Firebase Authentication | - |
| **File Storage** | Firebase Storage + Google Drive API | - |
| **Backend** | Firebase Cloud Functions | - |
| **Calendar** | Google Calendar API (2-way sync) | - |
| **Email** | Resend (production), Nodemailer (legacy) | - |
| **SMS** | Telnyx (production), Textbelt (testing), Twilio (legacy) | - |
| **Voice** | Vapi AI with custom tools | - |
| **AI** | Anthropic Claude SDK (OCR, risk scoring, forecasting) | - |
| **PDF** | @react-pdf/renderer, pdfjs-dist | - |
| **Charts** | Recharts | 3.x |
| **Testing** | Jest, Playwright | - |
| **Validation** | Zod | 4.x |
| **Icons** | Lucide React | - |

### Key Dependencies

- `firebase` / `firebase-admin` - Client and server Firebase SDK
- `googleapis` - Google Calendar, Sheets, Drive APIs
- `resend` - Email sending (production)
- `nodemailer` - Email sending (legacy)
- `@react-pdf/renderer` - PDF generation (invoices, contracts)
- `react-signature-canvas` - Digital signature capture
- `qrcode.react` - QR code generation (lead capture events)
- `recharts` - Dashboard charts and analytics
- `zod` - Runtime type validation
- `@t3-oss/env-nextjs` - Environment variable validation

---

## 3. Authentication & Authorization

### Authentication Flow

```
User Signs Up
      |
      v
+------------------+
| Pending Approval |  <-- Default status
+--------+---------+
         |
         v
   Admin Reviews
         |
    +----+----+
    v         v
 Approve    Reject
    |         |
    v         v
Assign Role  Notify &
    |        Archive
    v
User Activated
```

### Roles

| Role | Description | Access Level |
|------|-------------|--------------|
| **owner** | Full system access | All modules, all data, all actions |
| **admin** | Operations & accounting | All modules, approve users, financials |
| **sales_rep** | 1099 sales contractor | Assigned leads, job progress on their sales, commissions |
| **contractor** | 1099 installer/tech | Assigned jobs, availability, earnings |
| **pm** | Project Manager | Assigned jobs, crew management, mark complete |
| **sales_manager** | Sales team lead (future) | All sales reps, territories, performance |
| **subscriber** | External contractor | Lead portal, subscription management |
| **partner** | Partner company user | Labor requests, service tickets |
| **customer** | End customer | View own jobs, sign contracts remotely, view invoices |

### Permission Matrix

| Feature | owner | admin | sales_rep | contractor | pm | subscriber | partner | customer |
|---------|-------|-------|-----------|------------|-----|------------|---------|----------|
| Dashboard Overview | Full | Full | Limited | Limited | Limited | No | No | No |
| KR - All Jobs | Full | Full | No | No | Assigned | No | No | No |
| KR - Job Progress (own sales) | Full | Full | Yes | No | Yes | No | No | No |
| KR - Own Jobs (customer view) | Full | Full | No | No | No | No | No | Yes |
| KTS - All Contractors | Full | Full | No | No | Yes | No | No | No |
| KTS - Own Profile | Full | Full | Yes | Yes | Yes | No | No | No |
| KTS - Availability | Full | Full | Yes | Yes | Yes | No | No | No |
| KTS - Inventory | Full | Full | No | Own | View | No | No | No |
| KTS - Marketplace | Full | Full | No | Bid | Post | No | No | No |
| KD - Campaigns | Full | Full | No | No | No | No | No | No |
| KD - All Leads | Full | Full | No | No | No | No | No | No |
| KD - Assigned Leads | Full | Full | Yes | No | No | Yes | No | No |
| Financials - Full P&L | Full | Full | No | No | No | No | No | No |
| Financials - Own Earnings | Full | Full | Yes | Yes | Yes | No | No | No |
| Financials - Invoices | Full | Full | No | Own | No | View Own | No | View Own |
| Admin - User Management | Full | Full | No | No | No | No | No | No |
| Admin - Partners | Full | Full | No | No | No | No | No | No |
| Enterprise Features | Full | Full | No | No | No | No | No | No |
| Partner Portal | No | No | No | No | No | No | Full | No |
| Contractor Portal | No | No | No | Full | No | No | No | No |
| Subscriber Portal | No | No | No | No | No | Full | No | No |
| Remote Contract Signing | No | No | No | No | No | No | No | Yes |

### Role Check Pattern

```typescript
const { user, role } = useAuth();
if (!['owner', 'admin'].includes(role)) redirect('/unauthorized');
```

---

## 4. Security

### 4.1 Authentication Security

- **Firebase Authentication** handles all user identity management
- **Custom claims** used for admin roles in Storage rules (`request.auth.token.isAdmin`)
- **Pending approval flow** prevents unauthorized access - new signups cannot access the app until admin-approved
- **Suspended accounts** are blocked at login and redirected
- **Session management** handled by Firebase Auth SDK with automatic token refresh

### 4.2 Firestore Security Rules

All Firestore collections are protected by security rules (`firestore.rules`):

**Helper functions:**
- `isAuthenticated()` - Checks `request.auth != null`
- `isOwner()` - Validates user document has `role == 'owner'`
- `isAdmin()` - Validates user has `role in ['owner', 'admin']`
- `isInternalUser()` - Validates `role in ['owner', 'admin', 'sales_rep', 'contractor', 'pm']`
- `isActiveUser()` - Validates `status == 'active'`
- `isOwnDocument(userId)` - Validates `request.auth.uid == userId`

**Key security patterns:**
- **Users collection**: Users can create their own document only. Only admins can modify `role`, `status`, `approvedAt`, `approvedBy` fields. Users can update their own non-sensitive profile fields.
- **Contractors**: Internal users can read. Only admins create. Contractors can update own profile but cannot modify `rating` or `status`.
- **Jobs**: Internal users can read. Sales reps can create jobs where they are the sales rep. PMs can update their assigned jobs. Crew members can only update `photos` and `updatedAt`.
- **Invoices**: Contractors can read invoices where they are `from` or `to`. Contractors can create invoices from themselves. Contractors can only update their own drafts.
- **Leads**: Public lead creation allowed only for `source == 'event'` with required customer name. Sales reps can claim unassigned new leads.
- **Notifications**: Only Cloud Functions (admin SDK) can create. Users can only mark their own as read.
- **Rating Requests**: Public read (token-based security in app layer). Public update limited to rating fields only.
- **SMS/Voice**: Only Cloud Functions can create/update (webhook-driven).

**Enterprise collection rules:**
- **Marketplace Listings**: Active users can read. Admins and PMs can create listings. Contractors can submit bids (update `bids` array only).
- **Remote Signing Sessions**: Internal users can read, create, and update. Token-based public access at the app layer for signature submission.
- **Email Templates**: Admin only for read/write.
- **Email Queue**: Admin only for read/write. Cloud Functions process the queue.
- **Webhook Endpoints**: Admin only for CRUD.
- **Webhook Deliveries**: Admin only for read. Cloud Functions create deliveries.
- **API Keys**: Admin only for CRUD. Key hash stored, never the raw key.
- **Routing Rules**: Admin only for CRUD.
- **Saved Reports**: Admin only for CRUD. Users can read their own reports.

### 4.2.1 Enterprise Security Patches

- **SSRF Protection on Webhooks**: Webhook destination URLs are validated against an allowlist; private/internal IP ranges (10.x, 172.16-31.x, 192.168.x, localhost, 127.x) are blocked to prevent server-side request forgery.
- **PNG Validation on Signatures**: Uploaded signature images are validated for PNG magic bytes and reasonable file size before storage to prevent malicious file uploads.
- **Signed URLs for Signatures**: Signature images in Firebase Storage are served via time-limited signed URLs rather than public URLs to prevent unauthorized access.
- **Rate Limiting on Token Verification**: Remote signing token verification endpoints are rate-limited to prevent brute-force token guessing attacks.

### 4.3 Firebase Storage Security Rules

All uploads are validated by `storage.rules`:

- **File type validation**: Only images, PDFs, and Office documents allowed
- **File size limits**: 10MB general limit, 5MB for profile photos and public uploads
- **Path-based access control**:
  - `/contractors/{userId}/documents/` - Admin or own user only
  - `/jobs/{jobId}/photos/{category}/` - Authenticated users, category restricted to `before`/`after`
  - `/jobs/{jobId}/documents/` - Authenticated users
  - `/serviceTickets/{ticketId}/photos/` - Authenticated users
  - `/users/{userId}/profile/` - Own user only for writes
  - `/lead-attachments/` - Public write (for event QR code capture), authenticated read
  - `/receipts/{userId}/` - Own user only for writes
  - `/jobs/{jobId}/contracts/` - Authenticated users

### 4.4 API Route Security

- **Webhook signature verification** (`lib/auth/webhookSignature.ts`) - Validates incoming webhooks from Twilio, VAPI, Facebook
- **Request verification** (`lib/auth/verifyRequest.ts`) - Validates Firebase Auth tokens on API routes
- **Admin-only routes** (`app/api/admin/`) - Set-role and sync-claims require admin authentication
- **Environment variable validation** (`lib/env.ts`) - Uses Zod + `@t3-oss/env-nextjs` for runtime validation of all env vars

### 4.5 Data Protection

- **Sensitive fields**: ACH banking info in contractor records is marked for encryption
- **W-9 documents**: Stored in Firebase Storage with per-contractor access control
- **No client-side secrets**: All sensitive API keys (Google OAuth, Twilio, VAPI) are server-side only
- **NEXT_PUBLIC_ prefix**: Only Firebase client config is exposed to the browser
- **Firestore field-level protection**: Security rules prevent unauthorized field modifications (e.g., users can't change their own role/status)

### 4.6 Input Validation

- **Zod schemas** used for form validation and API input validation
- **Firestore rules** validate data structure on write operations
- **File upload validation** enforces MIME type and size restrictions at the storage layer
- **Lead capture** validates required fields (`customer.name` must be non-empty) even for public submissions

### 4.7 Network & Infrastructure Security

- **HTTPS enforced** by Vercel (automatic SSL)
- **Firebase security** includes DDoS protection, automatic scaling
- **Environment isolation** via `.env.local` (not committed to git)
- **Cloud Functions** run in isolated Node.js environments with admin SDK privileges
- **CORS** handled by Next.js API routes and Firebase Functions configuration

### 4.8 Compliance Integrations (Planned)

- **Background checks**: Checkr API integration for contractor vetting
- **W-9 collection**: TaxBandits API for automated W-9 + TIN matching
- **Insurance tracking**: Expiration monitoring with automated alerts
- **Contractor compliance status**: Computed `fullyCompliant` flag gating job assignments

---

## 5. Data Models

### 5.1 Firestore Collections

#### Users
```typescript
// users/{userId}
{
  uid: string;
  email: string;
  displayName: string;
  phone: string;
  role: 'owner' | 'admin' | 'sales_rep' | 'contractor' | 'pm' | 'subscriber' | 'partner' | 'customer';
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  partnerId?: string; // For partner role users
  createdAt: Timestamp;
  approvedAt?: Timestamp;
  approvedBy?: string;
  notificationPreferences?: NotificationPreferences;
  fcmTokens?: FCMToken[];
}

// users/{userId}/integrations/{integrationId}
// Stores Google Calendar OAuth tokens, etc.
```

#### Contractors
```typescript
// contractors/{contractorId}
{
  userId: string;
  businessName: string;
  address: { street, city, state, zip, lat, lng };
  trades: ('installer' | 'sales_rep' | 'service_tech' | 'pm')[];
  skills: string[];
  licenses: { type, number, state, expiration }[];
  insurance: { carrier, policyNumber, expiration, certificateUrl };
  w9Url: string;
  achInfo: { bankName, routingNumber, accountNumber }; // encrypted
  serviceRadius: number; // miles
  rating: { overall, customer, speed, warranty, internal };
  status: 'pending' | 'active' | 'inactive' | 'suspended';
  compliance?: {
    backgroundCheck: { status, provider, reportId, completedAt, expiresAt };
    w9: { status, pdfUrl, tinVerified, collectedAt, taxYear };
    insurance: { status, certificateUrl, carrier, policyNumber, coverageAmount, expiresAt };
    fullyCompliant: boolean;
    lastVerifiedAt: Timestamp;
  };
  createdAt: Timestamp;
}

// contractors/{contractorId}/availability/{dateId}
```

#### Jobs
```typescript
// jobs/{jobId}
{
  jobNumber: string; // auto-generated
  customer: { name, phone, email, address };
  type: 'bathroom' | 'kitchen' | 'exterior' | 'other';
  status: 'lead' | 'sold' | 'front_end_hold' | 'production' | 'scheduled' | 'started' | 'complete' | 'paid_in_full';
  salesRepId: string;
  crewIds: string[];
  pmId: string;
  costs: {
    materialProjected: number;
    materialActual: number;
    laborProjected: number;
    laborActual: number;
  };
  dates: {
    created, sold, scheduledStart, actualStart,
    targetCompletion, actualCompletion, paidInFull: Timestamp;
  };
  warranty: { startDate, endDate, status };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// jobs/{jobId}/communications/{commId}
{
  type: 'call' | 'email' | 'text' | 'note' | 'status_update';
  userId: string;
  content: string;
  attachments: string[];
  createdAt: Timestamp;
}
```

#### Service Tickets
```typescript
// serviceTickets/{ticketId}
{
  ticketNumber: string;
  jobId: string;
  customer: { name, phone, email, address };
  issue: string;
  photosBefore: string[];
  photosAfter: string[];
  assignedTechId: string;
  status: 'new' | 'assigned' | 'scheduled' | 'in_progress' | 'complete';
  resolution: string;
  createdAt: Timestamp;
  resolvedAt?: Timestamp;
}
```

#### Leads
```typescript
// leads/{leadId}
{
  source: 'google_ads' | 'meta' | 'tiktok' | 'event' | 'referral' | 'other';
  campaignId?: string;
  market: string;
  trade: string;
  customer: { name, phone, email, address };
  quality: 'hot' | 'warm' | 'cold';
  status: 'new' | 'assigned' | 'contacted' | 'qualified' | 'converted' | 'lost' | 'returned';
  assignedTo?: string;
  assignedType: 'internal' | 'subscriber';
  linkedJobId?: string;
  returnReason?: string;
  returnedAt?: Timestamp;
  createdAt: Timestamp;
}
```

#### Campaigns
```typescript
// campaigns/{campaignId}
{
  name: string;
  platform: 'google_ads' | 'meta' | 'tiktok' | 'event' | 'other';
  market: string;
  trade: string;
  startDate: Timestamp;
  endDate?: Timestamp;
  spend: number;
  leadsGenerated: number;
  createdAt: Timestamp;
}
```

#### Subscriptions
```typescript
// subscriptions/{subscriptionId}
{
  userId: string;
  tier: 'starter' | 'growth' | 'pro';
  monthlyFee: number;
  adSpendMin: number;
  leadCap: number;
  status: 'active' | 'paused' | 'cancelled';
  startDate: Timestamp;
  billingCycle: Timestamp;
}
```

#### Invoices
```typescript
// invoices/{invoiceId}
{
  invoiceNumber: string; // auto-generated
  from: { entity: string; name: string; contractorId?: string };
  to: { entity: string; name: string; email: string; contractorId?: string };
  lineItems: { description, qty, rate, total }[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  dueDate: Timestamp;
  sentAt?: Timestamp;
  paidAt?: Timestamp;
  createdAt: Timestamp;
}
```

#### Partners
```typescript
// partners/{partnerId}
{
  name: string;
  contactEmail: string;
  contactPhone: string;
  status: 'active' | 'inactive';
  createdAt: Timestamp;
}
```

#### Labor Requests
```typescript
// laborRequests/{requestId}
{
  partnerId: string;
  status: 'new' | 'assigned' | 'in_progress' | 'complete';
  description: string;
  createdAt: Timestamp;
}
```

#### Partner Service Tickets
```typescript
// partnerServiceTickets/{ticketId}
{
  partnerId: string;
  status: 'new' | 'assigned' | 'in_progress' | 'complete';
  issue: string;
  photos: string[];
  createdAt: Timestamp;
}
```

#### Inventory Collections
```typescript
// inventoryItems/{itemId}
{
  contractorId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  createdAt: Timestamp;
}

// inventoryLocations/{locationId}
{
  name: string;
  type: 'warehouse' | 'truck';
  contractorId?: string;
}

// inventoryStock/{stockId}
{
  locationId: string;
  itemId: string;
  quantity: number;
}

// inventoryCounts/{countId}
{
  locationId: string;
  items: { itemId, expected, actual }[];
  countedBy: string;
  createdAt: Timestamp;
}
```

#### Receipts & Expenses
```typescript
// receipts/{receiptId}
{
  contractorId: string;
  imageUrl: string;
  status: 'pending' | 'parsing' | 'parsed' | 'verified';
  parsedData?: { vendor, total, date, items };
  createdAt: Timestamp;
}

// expenses/{expenseId}
{
  contractorId: string;
  entity: string;
  category: string;
  amount: number;
  description: string;
  receiptId?: string;
  createdAt: Timestamp;
}
```

#### Notifications
```typescript
// notifications/{notificationId}
{
  userId: string;
  type: string; // 'insurance_expiring', 'new_lead', etc.
  category: 'compliance' | 'jobs' | 'leads' | 'financial' | 'admin';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  body: string;
  actionUrl: string;
  relatedEntity?: { type: string; id: string };
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  read: boolean;
  readAt?: Timestamp;
  sentAt?: Timestamp;
  createdAt: Timestamp;
}
```

#### Rating Requests
```typescript
// ratingRequests/{requestId}
{
  jobId: string;
  contractorId: string;
  token: string; // Public access token
  rating?: number;
  comment?: string;
  status: 'pending' | 'completed';
  completedAt?: Timestamp;
  createdAt: Timestamp;
}
```

#### Payouts
```typescript
// payouts/{payoutId}
{
  contractorId: string;
  jobId: string;
  amount: number;
  type: 'labor' | 'commission' | 'lead_fee';
  status: 'pending' | 'processed';
  createdAt: Timestamp;
}
```

#### SMS Conversations
```typescript
// smsConversations/{conversationId}
{
  leadId: string;
  phoneNumber: string;
  messages: { from, body, timestamp }[];
  status: 'active' | 'closed';
  createdAt: Timestamp;
}
```

#### Voice Calls & Inbound Calls
```typescript
// voiceCalls/{callId}
{
  leadId: string;
  duration: number;
  status: string;
  recordingUrl?: string;
  createdAt: Timestamp;
}

// inboundCalls/{callId}
{
  callerPhone: string;
  transcript?: string;
  status: 'new' | 'reviewed' | 'contacted' | 'converted' | 'closed';
  createdAt: Timestamp;
}
```

#### Contracts
```typescript
// contracts/{contractId}
{
  jobId: string;
  createdBy: string;
  signatureUrl?: string;
  pdfUrl?: string;
  status: 'draft' | 'sent' | 'signed';
  createdAt: Timestamp;
}
```

#### Marketplace Listings
```typescript
// marketplaceListings/{listingId}
{
  id: string;
  dealerId: string;
  dealerName: string;
  title: string;
  description: string;
  jobType: string;
  trade: string;
  location: { city, state, zip, lat, lng };
  dateNeeded: Timestamp;
  timeBlock: string;
  estimatedDuration: number; // hours
  payRate: number;
  payType: 'hourly' | 'flat' | 'per_unit';
  requiredSkills: string[];
  crewSize: number;
  status: 'open' | 'assigned' | 'in_progress' | 'complete' | 'cancelled';
  bids: {
    contractorId: string;
    amount: number;
    message: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Timestamp;
  }[];
  expiresAt: Timestamp;
  createdAt: Timestamp;
}
```

#### Remote Signing Sessions
```typescript
// remoteSigningSessions/{sessionId}
{
  id: string;
  contractId: string;
  jobId: string;
  token: string; // Unique signing token
  recipientEmail: string;
  recipientName: string;
  sentBy: string; // userId
  status: 'pending' | 'viewed' | 'signed' | 'expired';
  expiresAt: Timestamp;
  viewedAt?: Timestamp;
  signedAt?: Timestamp;
  signatureUrl?: string; // Firebase Storage URL
  ipAddress?: string;
  userAgent?: string;
  createdAt: Timestamp;
}
```

#### Email Templates
```typescript
// emailTemplates/{templateId}
{
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  trigger: string; // e.g., 'job_complete', 'lead_assigned', 'invoice_sent'
  triggerConditions: Record<string, any>;
  delayMinutes: number; // Delay before sending after trigger
  enabled: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Email Queue
```typescript
// emailQueue/{emailId}
{
  id: string;
  templateId?: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string;
  status: 'queued' | 'sending' | 'sent' | 'failed';
  scheduledFor: Timestamp;
  sentAt?: Timestamp;
  error?: string;
  metadata: Record<string, any>;
  createdAt: Timestamp;
}
```

#### Webhook Endpoints
```typescript
// webhookEndpoints/{endpointId}
{
  id: string;
  name: string;
  url: string;
  events: string[]; // e.g., ['job.complete', 'lead.created', 'invoice.paid']
  secret: string; // HMAC signing secret
  active: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Webhook Deliveries
```typescript
// webhookDeliveries/{deliveryId}
{
  id: string;
  endpointId: string;
  event: string;
  payload: Record<string, any>;
  status: 'pending' | 'success' | 'failed';
  responseCode?: number;
  responseBody?: string;
  attemptCount: number;
  createdAt: Timestamp;
}
```

#### API Keys
```typescript
// apiKeys/{keyId}
{
  id: string;
  name: string;
  keyHash: string; // SHA-256 hash of the API key
  keyPrefix: string; // First 8 chars for identification (e.g., 'kh_live_')
  permissions: string[]; // e.g., ['leads:read', 'leads:write', 'jobs:read']
  createdBy: string;
  lastUsedAt?: Timestamp;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
}
```

#### Routing Rules
```typescript
// routingRules/{ruleId}
{
  id: string;
  name: string;
  conditions: {
    trade?: string;
    market?: string;
    source?: string;
    quality?: 'hot' | 'warm' | 'cold';
  };
  targetTeam: string[]; // userIds or team identifiers
  priority: number; // Lower = higher priority
  active: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Saved Reports
```typescript
// savedReports/{reportId}
{
  id: string;
  name: string;
  description: string;
  metrics: string[]; // e.g., ['revenue', 'lead_count', 'conversion_rate']
  dateRange: { start: Timestamp; end: Timestamp };
  filters: { field: string; operator: string; value: any }[];
  groupBy: string; // e.g., 'market', 'trade', 'sales_rep'
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Job Postings & Applicants (Future)
```typescript
// jobPostings/{postingId}
{
  title: string;
  description: string;
  requirements: string[];
  location: { city, state, zip, lat, lng };
  trade: 'installer' | 'sales_rep' | 'service_tech' | 'pm';
  compensation: { type, min, max };
  status: 'draft' | 'active' | 'paused' | 'closed';
  syndication: { indeed, ziprecruiter };
  createdAt: Timestamp;
}

// applicants/{applicantId}
{
  postingId: string;
  source: 'indeed' | 'ziprecruiter' | 'linkedin' | 'direct' | 'referral';
  name: string;
  email: string;
  phone: string;
  status: 'new' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected';
  backgroundCheck?: { provider, status, reportUrl };
  w9?: { provider, status, tinMatch, pdfUrl };
  convertedToContractorId?: string;
  createdAt: Timestamp;
}
```

---

## 6. Module Specifications

### 6.1 Key Trade Solutions (KTS) - `/kts`

**Contractor Management:**
- CRUD operations for contractor profiles
- Contractor list with search, filter by trade/status/skills
- Multi-step onboarding wizard (Basic Info -> Documents -> Service Area -> Review)
- Document uploads (W-9, insurance) to Firebase Storage
- Status management: Pending, Active, Inactive, Suspended

**Performance Rating System:**
```
Overall Score = (Customer Rating x 0.40) + (Speed Score x 0.20) + (Warranty Score x 0.20) + (Internal Eval x 0.20)
```

| Tier | Rating | Commission |
|------|--------|------------|
| Elite | 4.5+ | 10% |
| Pro | 3.5-4.4 | 9% |
| Standard | 2.5-3.4 | 8% |
| Needs Improvement | 1.5-2.4 | Review required |
| Probation | <1.5 | Suspension pending review |

**Sales Rep Territories:**
- Radius-based from home address (default 25 miles)
- Overlap handling: Assign to highest-rated available rep
- Capacity limits: Max concurrent leads per rep (default: 10)

**Availability & Scheduling:**
- Google Calendar 2-way sync
- States: Available, Busy, Unavailable, On Leave
- Calendar view at `/kts/availability`

**Inventory Management:**
- Item tracking per contractor (`/kts/inventory`)
- Stock levels per location (warehouse/truck)
- Inventory count sessions
- Receipt upload with AI parsing
- Low stock alerts

**Contractor Portal** (`/portal`):
- Assigned jobs, earnings summary, payment history
- Performance rating display
- Availability calendar management
- Inventory management, receipt uploads

### 6.2 Key Renovations (KR) - `/kr`

**Job Pipeline (Kanban):**
```
Lead -> Sold -> Front End Hold -> Production -> Scheduled -> Started -> Complete -> Paid in Full
```

| Transition | Who Can Do It |
|------------|---------------|
| Lead -> Sold | Sales Rep, Admin, Owner |
| All others | PM, Admin, Owner |

**Job Management:**
- Full CRUD with search/filter by status, type, date, rep, crew
- Job detail page with tabs: Details, Costs, Timeline, Communication, Warranty
- Cost tracking (projected vs actual for materials and labor)
- Profit margin calculation
- Communication log with auto-logged status changes
- Crew assignment from KTS contractor pool
- Contract signing with digital signatures
- Completion certificates

**Warranty & Service:**
- Warranty: 1 year from job completion
- Service tickets linked to jobs
- Ticket pipeline: New -> Assigned -> Scheduled -> In Progress -> Complete
- Before/after photo documentation

### 6.3 Keynote Digital (KD) - `/kd`

**Lead Management:**
- Sources: Google Ads, Meta, TikTok, Event, Referral, Other
- Quality tiers: Hot, Warm, Cold
- Auto-assignment based on territory + performance rating
- Public lead capture via event QR codes (`/lead-generator`)
- Facebook webhook integration for Meta leads
- Inbound call capture via VAPI

**Lead Routing:**
- Internal leads (to KR): Route to sales rep by territory + rating
- External leads (to subscribers): Route by tier, geography, trade match
- Unassigned lead claiming by sales reps

**Lead Return Policy:**
- Valid reasons: Wrong contact info, outside service area, not real inquiry
- Must request within 24 hours
- No refund - lead replaced within 48 hours

**Campaign Tracking:**
- Per-platform performance (Google Ads, Meta, TikTok, Events)
- Spend vs ROI trends, CPL calculation
- Market and trade breakdowns

**Subscriber Management:**
| Tier | Monthly Fee | Lead Volume | Min Ad Spend |
|------|-------------|-------------|--------------|
| Starter | $399 | 10-15/month | $600 |
| Growth | $899 | 15-25/month | $900 |
| Pro | $1,499+ | Flexible | $1,500+ |

### 6.4 Financials - `/financials`

**Invoice Management:**
- Types: KD->KR (leads), KTS->KR (labor/commissions), KR->Customer, KD->Subscriber
- Statuses: Draft, Sent, Paid, Overdue
- Auto-invoice triggers on job completion, lead assignment, subscription cycle
- PDF generation and email sending via Gmail API
- Contractor self-service invoicing (draft creation)
- 20% internal discount for intercompany transactions
- Net 30 payment terms

**P&L Tracking:**
- Per-entity and combined P&L views
- Monthly/quarterly/annual filtering
- Revenue by category, expenses by category
- Intercompany transactions netted out
- Google Sheets export integration

**Payouts:**
- Track labor payments, commissions, lead fees
- Contractor earnings dashboard (MTD, YTD)
- Payment history

**Expense Tracking:**
- Direct expenses from receipt parsing
- Category assignment
- Per-contractor and per-entity views

### 6.5 Partner Portal - `/partner`

- External partner companies submit labor requests and service tickets
- Partner-scoped data isolation (partners only see their own data)
- Request pipeline: New -> Assigned -> In Progress -> Complete
- History view with date/type filtering
- Admin management at `/admin/partners`

### 6.6 Admin Module - `/admin`

- User approval/rejection workflow
- Role assignment and management
- User status management (active/suspended/inactive)
- Partner company management
- Partner request oversight
- Data seeding tools (development)

### 6.7 Settings - `/settings`

- Profile management (name, phone, password)
- Google Calendar connection/disconnection
- Notification preferences (push, email, per-category toggles)
- Quiet hours configuration

### 6.8 Enterprise Module - `/enterprise`

The Enterprise module provides 14 advanced features for scaling operations:

1. **Marketplace** — Job listing marketplace where dealers/PMs post work and contractors bid. Includes bid management, skill matching, and auto-assignment.
2. **Remote Contract Signing** — Token-based remote signing sessions sent via email. Recipients can view contracts and submit PNG signatures without logging in. Signed documents stored in Firebase Storage with audit trail (IP, user agent, timestamp).
3. **Email Automation** — Template-based email system with trigger conditions and configurable delays. Queue-based processing for reliability. Templates support HTML with variable interpolation.
4. **Webhook System** — Outbound webhook delivery for external integrations. HMAC-signed payloads, retry logic, delivery logging, and SSRF-protected URL validation.
5. **API Key Management** — Self-service API key creation for external integrations. SHA-256 hashed storage, prefix-based identification, granular permission scoping.
6. **Advanced Lead Routing** — Rule-based lead routing with conditions on trade, market, source, and quality. Priority-ordered rules with team-based targeting.
7. **Custom Reports** — Saved report configurations with configurable metrics, date ranges, filters, and grouping. Exportable to CSV/PDF.
8. **Bulk Lead Import** — CSV-based bulk lead import with validation, deduplication, and auto-routing.
9. **Job History Archive** — Full job package PDF export including contracts, photos, communications, and completion certificates.
10. **Advanced Analytics Dashboard** — Custom KPI dashboards with drill-down capabilities.
11. **Multi-Market Management** — Manage operations across multiple geographic markets with market-specific routing and reporting.
12. **SLA Tracking** — Service level agreement monitoring for response times, completion rates, and customer satisfaction.
13. **Audit Logging** — Comprehensive audit trail for compliance-sensitive operations.
14. **White-Label Configuration** — Per-tenant branding configuration (see White-Label section below).

### 6.9 AI Capabilities

**Vapi AI Voice Tools:**
- **Dispatch Calls** (`/api/voice/dispatch`) — AI-powered outbound calls to dispatch contractors to job sites with schedule details.
- **Appointment Reminders** (`/api/voice/appointment-reminder`) — Automated reminder calls to customers before scheduled appointments.
- **Rating Calls** (`/api/voice/rating-call`) — Post-job AI calls to collect customer satisfaction ratings.
- **Quote Follow-ups** (`/api/voice/quote-followup`) — AI follow-up calls to leads who received quotes but haven't responded.
- **Compliance Reminders** (`/api/voice/compliance-reminders`) — Automated calls to contractors about expiring documents (insurance, licenses).

**Claude AI Integration:**
- **OCR Receipt Parsing** (`/api/receipts/parse`) — Anthropic Claude SDK extracts vendor, total, date, and line items from receipt photos.
- **Risk Scoring** (`/api/ai/risk-score`) — AI-calculated job risk scores based on job type, crew experience, weather, customer history, and project complexity.
- **Smart Scheduling** — AI-suggested scheduling based on crew availability, travel distance, skill match, and historical performance.
- **Revenue Forecasting** — Predictive revenue models based on pipeline data, seasonal trends, and conversion rates.
- **SMS Response Generation** (`lib/sms/ai.ts`) — AI-generated contextual responses for lead SMS conversations.

### 6.10 White-Label System

**Tenant Configuration** (`lib/tenant.ts`):
- Per-tenant branding: company name, logo URL, primary/secondary colors, favicon
- Domain mapping for white-label deployments
- Feature flags per tenant
- Custom email sender addresses

**White-Label Script:**
- Build-time script that applies tenant configuration to the application
- Generates customized PWA manifest, theme colors, and branding assets
- Environment template (`env.template`) with all required white-label secrets

**Environment Template:**
- `WHITE_LABEL_COMPANY_NAME` — Display name
- `WHITE_LABEL_LOGO_URL` — Logo asset URL
- `WHITE_LABEL_PRIMARY_COLOR` — Brand primary color
- `WHITE_LABEL_DOMAIN` — Custom domain
- `WHITE_LABEL_SUPPORT_EMAIL` — Support contact
- `WHITE_LABEL_SENDER_EMAIL` — Email from address

### 6.11 Offline & PWA

**IndexedDB Cache:**
- Offline-first data caching for jobs, leads, contractor profiles, and notifications
- Automatic sync when connectivity is restored
- Conflict resolution using server-wins strategy with local change queuing

**Background Sync:**
- Service worker-based background sync for form submissions, photo uploads, and status updates
- Queued operations persisted in IndexedDB until successful delivery

**Offline Indicator:**
- Real-time connectivity status indicator in the app header
- Graceful degradation: read-only mode for cached data when offline
- Queue visualization showing pending sync operations

**PWA Features:**
- Installable on iOS, Android, and Desktop
- App-like navigation with bottom tabs (mobile) and side nav (desktop)
- Push notifications via Firebase Cloud Messaging
- Custom splash screens and app icons per platform

---

## 7. Cloud Functions

Located in `functions/src/`:

| Function | Type | Purpose |
|----------|------|---------|
| `triggers/invoiceTriggers` | Firestore trigger | Auto-generate invoices on job events |
| `triggers/leadEmailTriggers` | Firestore trigger | Send email on lead assignment |
| `triggers/notificationTriggers` | Firestore trigger | Push notifications on data changes |
| `triggers/availabilityTriggers` | Firestore trigger | Calendar sync on availability changes |
| `triggers/ratingTriggers` | Firestore trigger | Send rating requests on job completion |
| `triggers/leadAutoAssign` | Firestore trigger | Auto-assign leads by territory/rating |
| `triggers/emailTriggers` | Firestore trigger | General email notifications |
| `triggers/testUserTriggers` | Firestore trigger | Test/dev user handling |
| `scheduled/calendarSync` | Pub/Sub schedule | Periodic Google Calendar sync |
| `scheduled/dailySheetsTasks` | Pub/Sub schedule | Daily Google Sheets P&L sync |
| `lib/googleCalendar` | Library | Google Calendar API wrapper |
| `lib/googleSheets` | Library | Google Sheets API wrapper |
| `lib/sheetsSync` | Library | Sheets sync utilities |
| `lib/pnlSync` | Library | P&L calculation and sync |
| `lib/geocoding` | Library | Address geocoding utilities |

---

## 8. Notifications System

### Notification Categories

**Compliance & Expiration:**
- Insurance expiring (30-day, 7-day, expired) -> Contractor + Admin
- W-9 needed for tax year -> Contractor + Admin
- License expiring -> Contractor + Admin

**Job & Assignment:**
- New job assigned -> Contractor, PM
- Job schedule changed -> Contractor, PM
- Job starting tomorrow -> Contractor
- Job marked complete -> Admin, Sales Rep
- Service ticket created -> Service Tech, PM

**Lead:**
- New lead assigned -> Sales Rep / Subscriber
- Hot lead received -> Sales Rep (Urgent)
- Lead not contacted 24hr -> Sales Rep + Admin

**Financial:**
- Payment received -> Contractor
- Invoice overdue -> Admin
- Commission earned -> Sales Rep
- Subscription renewal/failure -> Subscriber + Admin

**Admin:**
- New user pending approval -> Admin, Owner
- Background check complete/flagged -> Admin

### Delivery

- **Push**: Firebase Cloud Messaging (FCM) via service worker
- **Quiet hours**: Configurable per-user (default 9PM-7AM), urgent bypasses
- **Per-category toggles**: Users control which notifications they receive
- **Default settings**: Vary by role (see notification preferences in user model)

---

## 9. Integrations

### Google Calendar (2-way sync)
- OAuth2 flow via `/api/google-calendar/auth` -> `/api/google-calendar/callback`
- Disconnect via `/api/google-calendar/disconnect`
- Tokens stored in `users/{userId}/integrations/google-calendar`
- Periodic sync via Cloud Function (`scheduled/calendarSync`)
- Real-time sync via Firestore triggers (`triggers/availabilityTriggers`)

### Google Sheets (P&L export)
- Expense sync via `/api/sheets/sync-expenses`
- Daily automated sync via Cloud Function (`scheduled/dailySheetsTasks`)

### Resend (Email - Production)
- Primary email delivery service for all outbound emails
- Template-based email automation via `emailTemplates` and `emailQueue` collections
- Lead confirmation emails via `/api/email/lead-confirmation`
- Auto-send invoices on status change
- Queued email processing via `/api/email/send-queued`
- Event-triggered emails via `/api/email/trigger`

### Nodemailer (Email - Legacy)
- Retained for backwards compatibility
- Used in some Cloud Functions for transactional emails

### Telnyx (SMS - Production)
- Primary SMS provider for production
- Webhook receiver at `/api/webhooks/twilio` (shared handler)
- Scheduled message processing at `/api/sms/process-scheduled`
- AI-powered response generation (`lib/sms/ai.ts`)
- SMS conversation tracking in Firestore

### Textbelt (SMS - Testing)
- Used for development and testing environments
- Free tier for local development

### Twilio (SMS - Legacy)
- Legacy SMS provider, retained for migration period
- Webhook signature verification still supported

### Vapi AI (Voice)
- Outbound calls via `/api/voice/call`
- **Dispatch calls** via `/api/voice/dispatch` — AI-powered contractor dispatch
- **Appointment reminders** via `/api/voice/appointment-reminder` — Customer reminders
- **Rating calls** via `/api/voice/rating-call` — Post-job satisfaction collection
- **Quote follow-ups** via `/api/voice/quote-followup` — Lead nurturing
- **Compliance reminders** via `/api/voice/compliance-reminders` — Document expiration alerts
- Inbound call capture and transcription
- Custom Vapi tools for CRM data lookup during calls
- Call records stored in `voiceCalls` and `inboundCalls` collections

### Facebook/Meta (Lead Ads)
- Webhook receiver at `/api/webhooks/facebook`
- Automatic lead creation from Meta Lead Ads

### Anthropic Claude (AI)
- Chat endpoint at `/api/chat`
- Receipt OCR parsing at `/api/receipts/parse`
- Job risk scoring at `/api/ai/risk-score`
- SMS response generation
- Smart scheduling suggestions
- Revenue forecasting

### Checkr (Background Checks) - Planned
- Webhook-driven status updates
- Auto-advance onboarding pipeline on clear status

### TaxBandits (W-9) - Planned
- Automated W-9 collection + e-signature
- TIN matching (SSN/EIN verification with IRS)
- 1099 generation at year-end

---

## 10. Business Logic

### Lead Assignment Algorithm
```
1. New lead comes in with address
2. Find all reps whose territory covers lead address (radius check)
3. Filter by availability (not at capacity)
4. Sort by performance rating (highest first)
5. Assign to top available rep
6. If no rep available -> Queue for manual assignment
```

### Invoice Auto-Generation Triggers
- Job marked "Paid in Full" -> Generate KTS invoice for labor/commission
- Lead assigned to KR -> Generate KD invoice for lead fee
- Monthly subscription cycle -> Generate KD invoice to subscriber

### Contractor Compliance Pipeline
```
Application Received -> Background Check -> W-9 Collection -> Insurance Upload -> Activated in KTS
```
Cost per contractor onboarded: ~$40-65

### Contractor Tier Upsell Path
```
Free Contractor -> Connected ($29/mo) -> Pro ($45/mo) -> KD Subscriber ($399+/mo)
```

### Internal Discount Policy
- 20% off market rates for intercompany transactions
- Net 30 payment terms

---

## 11. API Routes

| Route | Method | Purpose | Auth |
|-------|--------|---------|------|
| `/api/admin/set-role` | POST | Set user role (admin only) | Admin |
| `/api/admin/sync-claims` | POST | Sync Firebase custom claims | Admin |
| `/api/ai/risk-score` | POST | Calculate job risk score via Claude AI | Authenticated |
| `/api/chat` | POST | AI chat endpoint | Authenticated |
| `/api/contracts/remote-sign` | POST | Create remote signing session | Authenticated |
| `/api/contracts/remote-sign/verify` | GET | Validate signing token | Public (token-based) |
| `/api/contracts/remote-sign/complete` | POST | Accept signature submission | Public (token-based) |
| `/api/email/lead-confirmation` | POST | Send lead confirmation email | Authenticated |
| `/api/email/send-queued` | POST | Process email queue (batch send) | Server |
| `/api/email/trigger` | POST | Trigger email automation by event | Authenticated |
| `/api/google-calendar/auth` | GET | Start Google Calendar OAuth | Authenticated |
| `/api/google-calendar/callback` | GET | Google Calendar OAuth callback | Authenticated |
| `/api/google-calendar/disconnect` | POST | Disconnect Google Calendar | Authenticated |
| `/api/google-calendar/events` | GET | Sync and retrieve calendar events | Authenticated |
| `/api/leads/import` | POST | Bulk lead import from CSV | Admin |
| `/api/receipts/parse` | POST | AI receipt parsing | Authenticated |
| `/api/sheets/sync-expenses` | POST | Sync expenses to Google Sheets | Authenticated |
| `/api/sms/process-scheduled` | POST | Process scheduled SMS messages | Server |
| `/api/sms/simulate-reply` | POST | Simulate SMS reply (dev) | Server |
| `/api/voice/appointment-reminder` | POST | AI appointment reminder calls | Authenticated |
| `/api/voice/call` | POST | Initiate VAPI voice call | Authenticated |
| `/api/voice/compliance-reminders` | POST | AI compliance reminder calls | Authenticated |
| `/api/voice/debug` | GET | Voice call debug info | Authenticated |
| `/api/voice/dispatch` | POST | AI dispatch calls to contractors | Authenticated |
| `/api/voice/quote-followup` | POST | AI quote follow-up calls | Authenticated |
| `/api/voice/rating-call` | POST | AI customer rating calls | Authenticated |
| `/api/webhooks/facebook` | POST | Facebook/Meta lead webhook | Signature verified |
| `/api/webhooks/test` | POST | Test webhook endpoint delivery | Admin |
| `/api/webhooks/twilio` | POST | Twilio SMS webhook | Signature verified |

---

## 12. Testing

### Unit Tests (Jest)
```bash
npm run test              # Run all unit tests
npm run test:watch        # Watch mode
npm run test:coverage     # Coverage report
```

### E2E Tests (Playwright)
```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:ui       # Run with UI mode
```

### Test Accounts

| Role | Test Email | Notes |
|------|-----------|-------|
| Owner | owner@test.com | Full system access |
| Admin | admin@test.com | Operations & accounting |
| Sales Rep | salesrep@test.com | Assigned leads, job progress |
| Contractor | contractor@test.com | Assigned jobs, availability |
| PM | pm@test.com | Job oversight |
| Subscriber | subscriber@test.com | Lead portal access |
| Partner | partner@test.com | Partner portal access |

### UAT Test Coverage

The UAT plan covers 100+ test cases across all modules:
- **AUTH**: 19 test cases (signup, login, approval, password reset)
- **DASH/NAV**: 12 test cases (dashboard stats, navigation responsive)
- **KTS**: 21 test cases (contractors, availability, inventory)
- **KR**: 26 test cases (jobs, pipeline, costs, communication, warranty)
- **KD**: 25 test cases (leads, campaigns, subscribers, returns)
- **FIN**: 18 test cases (invoices, P&L, expenses, earnings)
- **Portals**: 25+ test cases (partner, contractor, subscriber portals)
- **Settings**: 11 test cases (profile, notifications, calendar)
- **PWA**: 5 test cases (install, offline, push, icon)
- **Cross-browser**: Chrome, Firefox, Safari, Edge on desktop/mobile/tablet

---

## 13. Deployment

### Frontend (Vercel)
- Auto-deploy on push to `main` branch
- Preview deploys on pull requests
- Environment variables configured in Vercel dashboard

### Backend (Firebase)
```bash
npm run firebase:deploy   # Deploy Firestore rules + Cloud Functions
```

### CI/CD
- GitHub repository with main branch protection
- Vercel auto-deployment pipeline
- Firebase manual deployment via CLI

---

## 14. Environment Variables

### Client-Side (NEXT_PUBLIC_)
```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### Server-Side
```env
# Firebase Admin
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Google APIs
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=
GMAIL_CLIENT_ID=
GMAIL_CLIENT_SECRET=

# Resend (Email - Production)
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Telnyx (SMS - Production)
TELNYX_API_KEY=
TELNYX_PHONE_NUMBER=
TELNYX_MESSAGING_PROFILE_ID=

# Textbelt (SMS - Testing)
TEXTBELT_API_KEY=

# Twilio (SMS - Legacy)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# VAPI (Voice)
VAPI_API_KEY=
VAPI_PHONE_NUMBER_ID=

# Anthropic (AI)
ANTHROPIC_API_KEY=

# White-Label
WHITE_LABEL_COMPANY_NAME=
WHITE_LABEL_LOGO_URL=
WHITE_LABEL_PRIMARY_COLOR=
WHITE_LABEL_DOMAIN=
WHITE_LABEL_SUPPORT_EMAIL=
WHITE_LABEL_SENDER_EMAIL=

# Payments (Planned)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Compliance (Planned)
CHECKR_API_KEY=
CHECKR_WEBHOOK_SECRET=
TAXBANDITS_API_KEY=
TAXBANDITS_WEBHOOK_SECRET=

# Job Boards (Planned)
INDEED_CLIENT_ID=
INDEED_CLIENT_SECRET=
ZIPRECRUITER_API_KEY=
```

All environment variables are validated at build time using Zod schemas via `@t3-oss/env-nextjs` (see `lib/env.ts`).

---

## Development Conventions

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
- Server state: Firebase real-time listeners via custom hooks
- Local state: React useState/useReducer
- Auth state: React Context (`AuthProvider` via `useAuth`)
- Sidebar state: React Context (`SidebarContext`)

### File Organization
- Firebase CRUD: `lib/firebase/*.ts`
- React hooks: `lib/hooks/*.tsx`
- Utility functions: `lib/utils/*.ts`
- Type definitions: `types/*.ts`
- UI components: `components/ui/*.tsx`
- Form components: `components/forms/*.tsx`

### Mobile-First Design
- Desktop: Side navigation (collapsible)
- Mobile: Bottom tab navigation
- All components must be touch-friendly and responsive
- PWA installable on iOS, Android, Desktop

---

*Document version 3.0 - Updated with enterprise features, AI capabilities, white-label, and offline/PWA support*

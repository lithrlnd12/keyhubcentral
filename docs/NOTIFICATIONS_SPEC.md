# Notifications System Specification

**Version:** 1.0
**Last Updated:** January 2, 2026

---

## Overview

Push notifications for desktop and mobile PWA with user-controllable preferences. Notifications should be valuable and actionable, not overwhelming.

---

## 1. Notification Categories

### Compliance & Expiration Alerts

| Notification | Recipients | Trigger | Priority |
|--------------|------------|---------|----------|
| Insurance expiring (30 days) | Contractor, Admin | 30 days before expiration | Medium |
| Insurance expiring (7 days) | Contractor, Admin | 7 days before expiration | High |
| Insurance expired | Contractor, Admin | Day of expiration | Urgent |
| W-9 needed for tax year | Contractor, Admin | January 1st annually | Medium |
| Background check expiring | Admin | If annual re-check enabled | Medium |
| License expiring | Contractor, Admin | 30 days before | Medium |

### Job & Assignment Alerts

| Notification | Recipients | Trigger | Priority |
|--------------|------------|---------|----------|
| New job assigned | Contractor, PM | Job assigned to them | High |
| Job schedule changed | Contractor, PM | Start date modified | High |
| Job starting tomorrow | Contractor | Day before scheduled start | Medium |
| Job status updated | PM, Admin | Status change (configurable) | Low |
| Job marked complete | Admin, Sales Rep | Job → Complete | Medium |
| Service ticket created | Service Tech, PM | New ticket for their job | High |

### Lead Alerts

| Notification | Recipients | Trigger | Priority |
|--------------|------------|---------|----------|
| New lead assigned | Sales Rep | Lead assigned to them | High |
| New lead received | Subscriber | Lead delivered | High |
| Lead not contacted (24hr) | Sales Rep, Admin | No activity after 24hrs | Medium |
| Lead returned - replacement ready | Subscriber | Replacement lead available | Medium |
| Hot lead received | Sales Rep | Lead quality = hot | Urgent |

### Financial Alerts

| Notification | Recipients | Trigger | Priority |
|--------------|------------|---------|----------|
| Payment received | Contractor | Payment processed | Medium |
| Invoice overdue | Admin | Invoice past due date | High |
| Commission earned | Sales Rep | Job marked paid in full | Medium |
| Subscription renewal (7 days) | Subscriber | 7 days before billing | Medium |
| Subscription payment failed | Subscriber, Admin | Payment declined | Urgent |

### Admin & System Alerts

| Notification | Recipients | Trigger | Priority |
|--------------|------------|---------|----------|
| New user pending approval | Admin, Owner | User signs up | High |
| Background check complete | Admin | Checkr webhook received | Medium |
| Background check flagged | Admin | Status = "consider" | High |
| New applicant received | Admin | Indeed/ZipRecruiter application | Medium |

---

## 2. Default Settings by Role

### Owner / Admin
```
✅ ON by default:
- Insurance expiring (all contractors)
- User pending approval
- Background check flagged
- Invoice overdue
- Subscription payment failed
- New applicant received

⬚ OFF by default (can enable):
- All job status updates
- All lead assignments
- Payment received (all)
```

### Contractor (Installer/Service Tech)
```
✅ ON by default:
- New job assigned
- Job schedule changed
- Job starting tomorrow
- Payment received
- Insurance expiring (own)
- License expiring (own)

⬚ OFF by default:
- Job status updates (others)
```

### Sales Rep
```
✅ ON by default:
- New lead assigned
- Hot lead received
- Lead not contacted (24hr)
- Commission earned
- Job marked complete (own sales)

⬚ OFF by default:
- All job status updates
```

### Project Manager
```
✅ ON by default:
- Job assigned (their jobs)
- Job status updated (their jobs)
- Service ticket created
- Crew availability changed

⬚ OFF by default:
- Financial notifications
```

### Subscriber (KD)
```
✅ ON by default:
- New lead received
- Lead returned - replacement ready
- Subscription renewal reminder
- Payment failed

⬚ OFF by default:
- (most things not applicable)
```

---

## 3. User Preference Controls

### Settings UI Structure

```
Notifications
├── Push Notifications
│   ├── Enable push notifications (master toggle)
│   ├── Desktop notifications
│   └── Mobile notifications
│
├── Compliance Alerts
│   ├── Insurance expiring ────────── [On/Off]
│   ├── License expiring ──────────── [On/Off]
│   ├── W-9 reminders ─────────────── [On/Off]
│   └── Background check updates ──── [On/Off] (admin only)
│
├── Job Alerts
│   ├── New assignments ───────────── [On/Off]
│   ├── Schedule changes ──────────── [On/Off]
│   ├── Day-before reminders ──────── [On/Off]
│   └── Status updates ────────────── [On/Off]
│
├── Lead Alerts (sales rep / subscriber)
│   ├── New leads ─────────────────── [On/Off]
│   ├── Hot leads only ────────────── [On/Off]
│   ├── Inactivity reminders ──────── [On/Off]
│   └── Lead replacements ─────────── [On/Off]
│
├── Financial Alerts
│   ├── Payments received ─────────── [On/Off]
│   ├── Commissions earned ────────── [On/Off]
│   ├── Invoice overdue ───────────── [On/Off] (admin only)
│   └── Subscription reminders ────── [On/Off]
│
├── Admin Alerts (admin/owner only)
│   ├── User approvals needed ─────── [On/Off]
│   ├── New applicants ────────────── [On/Off]
│   └── System alerts ─────────────── [On/Off]
│
└── Quiet Hours
    ├── Enable quiet hours ────────── [On/Off]
    ├── Start time ────────────────── [9:00 PM]
    └── End time ──────────────────── [7:00 AM]
```

---

## 4. Notification Content Templates

### Format
```
{title}
{body}
{action_url}
```

### Examples

**Insurance Expiring (30 days)**
```
Title: Insurance Expires in 30 Days
Body: Your insurance policy expires on Feb 1, 2026. Upload a new certificate to stay compliant.
Action: /portal/documents
```

**Insurance Expiring (7 days)**
```
Title: ⚠️ Insurance Expires in 7 Days
Body: Your insurance expires Jan 9. Upload new certificate now to avoid work interruption.
Action: /portal/documents
```

**Insurance Expired**
```
Title: 🚨 Insurance Expired - Action Required
Body: Your insurance has expired. You cannot be assigned jobs until updated.
Action: /portal/documents
```

**New Job Assigned**
```
Title: New Job Assignment
Body: You've been assigned to {jobType} at {address}. Scheduled for {date}.
Action: /portal/jobs/{jobId}
```

**New Lead Assigned**
```
Title: New Lead: {customerName}
Body: {tradeType} lead in {city}. Quality: {quality}. Contact within 1 hour for best results.
Action: /leads/{leadId}
```

**Hot Lead Received**
```
Title: 🔥 Hot Lead: {customerName}
Body: High-intent {tradeType} lead in {city}. Call now!
Action: /leads/{leadId}
```

**Payment Received**
```
Title: Payment Received
Body: ${amount} deposited for {jobDescription}. View details in your earnings.
Action: /portal/earnings
```

**User Pending Approval**
```
Title: New User Awaiting Approval
Body: {userName} ({email}) signed up as {requestedRole}. Review their application.
Action: /admin/users/pending
```

**Background Check Flagged**
```
Title: ⚠️ Background Check Needs Review
Body: {applicantName}'s background check returned "consider" status. Review required.
Action: /recruiting/applicants/{applicantId}
```

---

## 5. Data Models

### User Notification Preferences

```javascript
// Stored in users/{userId}/settings/notifications
// or as a subcollection: users/{userId}
{
  notificationPreferences: {
    // Master controls
    pushEnabled: true,
    desktopEnabled: true,
    mobileEnabled: true,
    emailDigest: 'daily' | 'weekly' | 'none',

    // Quiet hours
    quietHours: {
      enabled: true,
      start: '21:00',  // 9 PM
      end: '07:00'     // 7 AM
    },

    // Category preferences
    compliance: {
      insuranceExpiring: true,
      licenseExpiring: true,
      w9Reminders: true,
      backgroundCheckUpdates: true
    },

    jobs: {
      newAssignments: true,
      scheduleChanges: true,
      dayBeforeReminders: true,
      statusUpdates: false
    },

    leads: {
      newLeads: true,
      hotLeadsOnly: false,
      inactivityReminders: true,
      leadReplacements: true
    },

    financial: {
      paymentsReceived: true,
      commissionsEarned: true,
      invoiceOverdue: true,
      subscriptionReminders: true
    },

    admin: {
      userApprovals: true,
      newApplicants: true,
      systemAlerts: true
    }
  },

  // FCM tokens for push delivery
  fcmTokens: [
    {
      token: string,
      device: 'desktop' | 'mobile',
      browser: string,
      createdAt: timestamp,
      lastUsedAt: timestamp
    }
  ]
}
```

### Notification Log

```javascript
// notifications/{notificationId}
{
  id: string,
  userId: string,

  // Content
  type: string,  // 'insurance_expiring', 'new_lead', etc.
  category: 'compliance' | 'jobs' | 'leads' | 'financial' | 'admin',
  priority: 'low' | 'medium' | 'high' | 'urgent',

  title: string,
  body: string,
  actionUrl: string,

  // Related entities
  relatedEntity: {
    type: 'job' | 'lead' | 'contractor' | 'invoice' | 'user' | 'applicant',
    id: string
  },

  // Delivery status
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read',
  sentAt: timestamp,
  deliveredAt: timestamp,
  readAt: timestamp,

  // Delivery channels
  channels: {
    push: {sent: boolean, error: string},
    email: {sent: boolean, error: string}
  },

  createdAt: timestamp
}
```

### Scheduled Notifications (for expiration checks)

```javascript
// scheduledNotifications/{id}
{
  type: 'insurance_expiring_30' | 'insurance_expiring_7' | 'insurance_expired',
  targetUserId: string,
  targetEntityId: string,  // contractorId
  scheduledFor: timestamp,
  status: 'pending' | 'sent' | 'cancelled',
  createdAt: timestamp
}
```

---

## 6. Technical Implementation

### Firebase Cloud Messaging (FCM)

**Service Worker (PWA)**
```javascript
// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: '...',
  projectId: '...',
  messagingSenderId: '...',
  appId: '...'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, actionUrl } = payload.data;

  self.registration.showNotification(title, {
    body,
    icon: '/icons/notification-icon.png',
    badge: '/icons/badge-icon.png',
    data: { actionUrl },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' }
    ]
  });
});
```

### Cloud Function: Send Notification

```typescript
// functions/src/notifications/sendNotification.ts
import * as admin from 'firebase-admin';

interface NotificationPayload {
  userId: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  body: string;
  actionUrl: string;
  relatedEntity?: { type: string; id: string };
}

export async function sendNotification(payload: NotificationPayload) {
  const db = admin.firestore();
  const messaging = admin.messaging();

  // Get user preferences
  const userDoc = await db.collection('users').doc(payload.userId).get();
  const user = userDoc.data();
  const prefs = user?.notificationPreferences;

  // Check if notification type is enabled
  if (!isNotificationEnabled(prefs, payload.category, payload.type)) {
    return { sent: false, reason: 'disabled_by_user' };
  }

  // Check quiet hours
  if (isQuietHours(prefs?.quietHours)) {
    // Queue for later or skip based on priority
    if (payload.priority !== 'urgent') {
      return { sent: false, reason: 'quiet_hours' };
    }
  }

  // Log notification
  const notificationRef = await db.collection('notifications').add({
    ...payload,
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Send to all user's FCM tokens
  const tokens = user?.fcmTokens?.map(t => t.token) || [];

  if (tokens.length > 0) {
    const message = {
      tokens,
      data: {
        title: payload.title,
        body: payload.body,
        actionUrl: payload.actionUrl,
        notificationId: notificationRef.id
      },
      webpush: {
        fcmOptions: {
          link: payload.actionUrl
        }
      }
    };

    const response = await messaging.sendEachForMulticast(message);

    await notificationRef.update({
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      'channels.push.sent': true
    });

    return { sent: true, successCount: response.successCount };
  }

  return { sent: false, reason: 'no_tokens' };
}
```

### Cloud Function: Daily Expiration Check

```typescript
// functions/src/notifications/checkExpirations.ts
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendNotification } from './sendNotification';

export const checkExpirations = functions.pubsub
  .schedule('0 8 * * *')  // 8 AM daily
  .timeZone('America/New_York')
  .onRun(async () => {
    const db = admin.firestore();
    const now = new Date();

    // Check insurance expirations
    const contractors = await db.collection('contractors')
      .where('status', '==', 'active')
      .get();

    for (const doc of contractors.docs) {
      const contractor = doc.data();
      const insuranceExpires = contractor.insurance?.expiration?.toDate();

      if (!insuranceExpires) continue;

      const daysUntilExpiry = Math.ceil(
        (insuranceExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // 30-day warning
      if (daysUntilExpiry === 30) {
        await sendNotification({
          userId: contractor.userId,
          type: 'insurance_expiring_30',
          category: 'compliance',
          priority: 'medium',
          title: 'Insurance Expires in 30 Days',
          body: `Your insurance expires on ${insuranceExpires.toLocaleDateString()}. Upload a new certificate to stay compliant.`,
          actionUrl: '/portal/documents',
          relatedEntity: { type: 'contractor', id: doc.id }
        });

        // Also notify admins
        await notifyAdmins('insurance_expiring_30', contractor, 30);
      }

      // 7-day warning
      if (daysUntilExpiry === 7) {
        await sendNotification({
          userId: contractor.userId,
          type: 'insurance_expiring_7',
          category: 'compliance',
          priority: 'high',
          title: '⚠️ Insurance Expires in 7 Days',
          body: `Your insurance expires ${insuranceExpires.toLocaleDateString()}. Upload new certificate now.`,
          actionUrl: '/portal/documents',
          relatedEntity: { type: 'contractor', id: doc.id }
        });

        await notifyAdmins('insurance_expiring_7', contractor, 7);
      }

      // Expired
      if (daysUntilExpiry === 0) {
        await sendNotification({
          userId: contractor.userId,
          type: 'insurance_expired',
          category: 'compliance',
          priority: 'urgent',
          title: '🚨 Insurance Expired - Action Required',
          body: 'Your insurance has expired. You cannot be assigned jobs until updated.',
          actionUrl: '/portal/documents',
          relatedEntity: { type: 'contractor', id: doc.id }
        });

        await notifyAdmins('insurance_expired', contractor, 0);

        // Update contractor compliance status
        await doc.ref.update({
          'compliance.insurance.status': 'expired',
          'compliance.fullyCompliant': false
        });
      }
    }
  });
```

---

## 7. Notification Triggers Summary

| Event | Cloud Function Trigger |
|-------|------------------------|
| Insurance/License expiring | Scheduled (daily 8 AM) |
| New job assigned | Firestore onCreate/onUpdate on jobs |
| Job schedule changed | Firestore onUpdate on jobs |
| New lead assigned | Firestore onCreate on leads |
| Lead inactivity | Scheduled (hourly check) |
| Payment received | Firestore onCreate on payments |
| Invoice overdue | Scheduled (daily check) |
| User pending approval | Firestore onCreate on users |
| Background check complete | Checkr webhook handler |
| New applicant | Indeed/ZipRecruiter webhook |

---

## 8. Settings UI Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  ← Settings                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  NOTIFICATIONS                                              │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Push Notifications                          [====•] │   │
│  │ Receive alerts on this device                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Compliance Alerts                                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Insurance expiring                          [====•] │   │
│  │ License expiring                            [====•] │   │
│  │ W-9 reminders                               [====•] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Job Alerts                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ New assignments                             [====•] │   │
│  │ Schedule changes                            [====•] │   │
│  │ Day-before reminders                        [====•] │   │
│  │ Status updates                              [•====] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Financial Alerts                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Payments received                           [====•] │   │
│  │ Commissions earned                          [====•] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Quiet Hours                                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Enable quiet hours                          [====•] │   │
│  │ ┌─────────────┐      ┌─────────────┐               │   │
│  │ │  9:00 PM    │  to  │  7:00 AM    │               │   │
│  │ └─────────────┘      └─────────────┘               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*Document version 1.0*

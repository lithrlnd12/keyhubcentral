// Firebase Messaging Service Worker
// This handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase is initialized lazily via a message from the main app,
// because service workers cannot access NEXT_PUBLIC_* env vars.
let messaging = null;

function setupMessaging() {
  if (messaging) return;
  messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const data = payload.data || {};
    const priority = data.priority || 'medium';

    const NOTIFICATION_CONFIG = {
      urgent: { requireInteraction: true, silent: false },
      high: { requireInteraction: true, silent: false },
      medium: { requireInteraction: false, silent: false },
      low: { requireInteraction: false, silent: true },
    };

    const config = NOTIFICATION_CONFIG[priority] || NOTIFICATION_CONFIG.medium;

    const notificationTitle = payload.notification?.title || data.title || 'KeyHub Central';
    const notificationOptions = {
      body: payload.notification?.body || data.body || '',
      icon: '/logo.svg',
      badge: '/logo.svg',
      data: data,
      tag: data.type || 'default',
      requireInteraction: config.requireInteraction,
      silent: config.silent,
      actions: getNotificationActions(data.type),
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Receive Firebase config from the main app and initialize
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(event.data.config);
    }
    setupMessaging();
  }
});

// Get actions based on notification type
function getNotificationActions(type) {
  switch (type) {
    case 'lead_assigned':
    case 'lead_hot':
      return [
        { action: 'view', title: 'View Lead' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'job_assigned':
    case 'job_schedule_changed':
      return [
        { action: 'view', title: 'View Job' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'insurance_expiring_7':
    case 'insurance_expired':
      return [
        { action: 'upload', title: 'Upload Now' },
        { action: 'remind', title: 'Remind Later' },
      ];
    case 'user_pending_approval':
      return [
        { action: 'review', title: 'Review' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    default:
      return [
        { action: 'view', title: 'View' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
  }
}

// Get URL based on notification type and data
function getNotificationUrl(data) {
  const type = data.type || '';

  switch (type) {
    // Compliance
    case 'insurance_expiring_30':
    case 'insurance_expiring_7':
    case 'insurance_expired':
    case 'license_expiring':
    case 'w9_needed':
      return data.actionUrl || '/portal/documents';
    case 'background_check_complete':
    case 'background_check_flagged':
      return data.applicantId ? `/recruiting/applicants/${data.applicantId}` : '/admin';

    // Jobs
    case 'job_assigned':
    case 'job_schedule_changed':
    case 'job_starting_tomorrow':
    case 'job_status_updated':
    case 'job_completed':
      return data.jobId ? `/kr/${data.jobId}` : '/kr';
    case 'service_ticket_created':
      return data.ticketId ? `/kr/service/${data.ticketId}` : '/kr';

    // Leads
    case 'lead_assigned':
    case 'lead_hot':
    case 'lead_not_contacted':
    case 'lead_replacement_ready':
      return data.leadId ? `/kd/leads/${data.leadId}` : '/kd';

    // Financial
    case 'payment_received':
    case 'commission_earned':
      return '/financials/earnings';
    case 'invoice_overdue':
      return data.invoiceId ? `/financials/invoices/${data.invoiceId}` : '/financials/invoices';
    case 'subscription_renewal':
    case 'subscription_payment_failed':
      return '/subscriber/subscription';

    // Admin
    case 'user_pending_approval':
      return '/admin';
    case 'new_applicant':
      return data.applicantId ? `/recruiting/applicants/${data.applicantId}` : '/recruiting';

    default:
      return data.actionUrl || '/overview';
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Handle specific actions
  if (action === 'dismiss') {
    return;
  }

  if (action === 'remind') {
    // Could schedule a reminder, for now just dismiss
    return;
  }

  // Get URL based on notification type
  const url = getNotificationUrl(data);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open a new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

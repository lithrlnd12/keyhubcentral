// Firebase Messaging Service Worker
// Handles background push notifications with a direct push listener fallback
// so notifications work even if the Firebase SDK hasn't been initialized.

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

let messaging = null;
let firebaseInitialized = false;

function setupMessaging() {
  if (messaging) return;
  messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    // Firebase SDK handled the push — show notification
    showNotification(payload.data || {});
  });
}

// Receive Firebase config from the main app and initialize
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (firebase.apps.length === 0) {
      firebase.initializeApp(event.data.config);
    }
    firebaseInitialized = true;
    setupMessaging();
  }
});

// FALLBACK: Direct push event listener.
// If the Firebase SDK isn't initialized (SW restarted, app closed, etc.),
// onBackgroundMessage won't fire. This catches those pushes directly.
self.addEventListener('push', (event) => {
  // If Firebase messaging is initialized, let onBackgroundMessage handle it
  if (firebaseInitialized && messaging) return;

  if (!event.data) return;

  let data = {};
  try {
    const payload = event.data.json();
    // FCM wraps data in a `data` key, or may include `notification`
    data = payload.data || payload.notification || payload;
  } catch {
    // Not JSON — ignore
    return;
  }

  event.waitUntil(showNotification(data));
});

// Show a notification from push data
function showNotification(data) {
  const priority = data.priority || 'medium';

  const NOTIFICATION_CONFIG = {
    urgent: { requireInteraction: true, silent: false },
    high: { requireInteraction: true, silent: false },
    medium: { requireInteraction: false, silent: false },
    low: { requireInteraction: false, silent: true },
  };

  const config = NOTIFICATION_CONFIG[priority] || NOTIFICATION_CONFIG.medium;

  const title = data.title || 'KeyHub Central';
  const options = {
    body: data.body || '',
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: data,
    tag: data.type || 'default',
    requireInteraction: config.requireInteraction,
    silent: config.silent,
    actions: getNotificationActions(data.type),
  };

  return self.registration.showNotification(title, options);
}

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
    case 'new_direct_message':
    case 'new_group_message':
      return [
        { action: 'reply', title: 'Open Chat' },
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
    case 'insurance_expiring_30':
    case 'insurance_expiring_7':
    case 'insurance_expired':
    case 'license_expiring':
    case 'w9_needed':
      return data.actionUrl || '/portal/documents';
    case 'background_check_complete':
    case 'background_check_flagged':
      return data.applicantId ? `/recruiting/applicants/${data.applicantId}` : '/admin';
    case 'job_assigned':
    case 'job_schedule_changed':
    case 'job_starting_tomorrow':
    case 'job_status_updated':
    case 'job_completed':
      return data.jobId ? `/kr/${data.jobId}` : '/kr';
    case 'service_ticket_created':
      return data.ticketId ? `/kr/service/${data.ticketId}` : '/kr';
    case 'lead_assigned':
    case 'lead_hot':
    case 'lead_not_contacted':
    case 'lead_replacement_ready':
      return data.leadId ? `/kd/leads/${data.leadId}` : '/kd';
    case 'payment_received':
    case 'commission_earned':
      return '/financials/earnings';
    case 'invoice_overdue':
      return data.invoiceId ? `/financials/invoices/${data.invoiceId}` : '/financials/invoices';
    case 'subscription_renewal':
    case 'subscription_payment_failed':
      return '/subscriber/subscription';
    case 'user_pending_approval':
      return '/admin';
    case 'new_applicant':
      return data.applicantId ? `/recruiting/applicants/${data.applicantId}` : '/recruiting';
    case 'new_direct_message':
    case 'new_group_message':
      return data.conversationId ? `/messages/${data.conversationId}` : '/messages';
    default:
      return data.actionUrl || '/overview';
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  if (action === 'dismiss' || action === 'remind') return;

  const url = getNotificationUrl(data);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

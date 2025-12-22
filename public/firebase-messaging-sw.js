// Firebase Messaging Service Worker
// This handles background push notifications

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
  apiKey: self.FIREBASE_CONFIG?.apiKey || '',
  authDomain: self.FIREBASE_CONFIG?.authDomain || '',
  projectId: self.FIREBASE_CONFIG?.projectId || '',
  storageBucket: self.FIREBASE_CONFIG?.storageBucket || '',
  messagingSenderId: self.FIREBASE_CONFIG?.messagingSenderId || '',
  appId: self.FIREBASE_CONFIG?.appId || '',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'KeyHub Central';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: payload.data,
    tag: payload.data?.type || 'default',
    requireInteraction: true,
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click:', event);
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/overview';

  // Navigate based on notification type
  switch (data.type) {
    case 'new_lead':
      url = data.leadId ? `/kd/leads/${data.leadId}` : '/kd';
      break;
    case 'job_update':
      url = data.jobId ? `/kr/${data.jobId}` : '/kr';
      break;
    case 'invoice_paid':
    case 'invoice_overdue':
      url = data.invoiceId ? `/financials/invoices/${data.invoiceId}` : '/financials';
      break;
    case 'contractor_approved':
      url = '/portal';
      break;
    case 'assignment':
      url = data.jobId ? `/portal/jobs` : '/portal';
      break;
    default:
      url = '/overview';
  }

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

import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { app } from './config';
import { tenant } from '@/lib/config/tenant';
import { saveFCMToken, removeFCMToken } from './notifications';

let messaging: Messaging | null = null;

// Initialize messaging only in browser with service worker support
export function initializeMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!('serviceWorker' in navigator)) return null;
  if (!('PushManager' in window)) return null;

  if (!messaging) {
    try {
      messaging = getMessaging(app);
    } catch (error) {
      console.error('Failed to initialize Firebase Messaging:', error);
      return null;
    }
  }
  return messaging;
}

// Request notification permission and get FCM token
export async function requestNotificationPermission(userId: string): Promise<string | null> {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('Notification permission denied');
      return null;
    }

    // Register firebase-messaging-sw.js explicitly so getToken doesn't hang
    // looking for it (next-pwa registers sw.js which is a different SW)
    const swRegistration = await navigator.serviceWorker.register(
      '/firebase-messaging-sw.js',
      { scope: '/' }
    );

    // Send Firebase config to the SW so it can initialize
    const sw = swRegistration.active ?? swRegistration.installing ?? swRegistration.waiting;
    if (sw) {
      sw.postMessage({
        type: 'FIREBASE_CONFIG',
        config: {
          apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
        },
      });
    }

    // Get FCM token using the explicit SW registration
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: swRegistration,
    });

    if (token) {
      // Save token to user document in the object format Cloud Functions expect
      const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
      const browser = navigator.userAgent.includes('Chrome')
        ? 'Chrome'
        : navigator.userAgent.includes('Firefox')
          ? 'Firefox'
          : navigator.userAgent.includes('Safari')
            ? 'Safari'
            : 'Other';
      await saveFCMToken(userId, token, {
        device: isMobile ? 'mobile' : 'desktop',
        browser,
      });
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

// Re-export for any consumers that imported from this module
export { removeFCMToken as removeTokenFromUser } from './notifications';

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: NotificationPayload) => void): () => void {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) {
    return () => {};
  }

  return onMessage(messagingInstance, (payload) => {
    const notificationPayload: NotificationPayload = {
      title: payload.notification?.title || tenant.appName,
      body: payload.notification?.body || '',
      icon: payload.notification?.icon || '/logo.svg',
      data: payload.data as Record<string, string>,
    };
    callback(notificationPayload);
  });
}

// Notification payload type
export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  data?: Record<string, string>;
}

// Notification types for the app
export type NotificationType =
  | 'new_lead'
  | 'job_update'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'contractor_approved'
  | 'assignment'
  | 'system';

// Create notification data for different types
export function createNotificationData(
  type: NotificationType,
  data: Record<string, string>
): { title: string; body: string; data: Record<string, string> } {
  const notifications: Record<NotificationType, { title: string; body: string }> = {
    new_lead: {
      title: 'New Lead',
      body: `New lead from ${data.source || 'unknown source'}`,
    },
    job_update: {
      title: 'Job Update',
      body: `Job ${data.jobNumber || ''} status changed to ${data.status || ''}`,
    },
    invoice_paid: {
      title: 'Invoice Paid',
      body: `Invoice ${data.invoiceNumber || ''} has been paid`,
    },
    invoice_overdue: {
      title: 'Invoice Overdue',
      body: `Invoice ${data.invoiceNumber || ''} is now overdue`,
    },
    contractor_approved: {
      title: 'Application Approved',
      body: 'Your contractor application has been approved',
    },
    assignment: {
      title: 'New Assignment',
      body: `You have been assigned to ${data.type || 'a new task'}`,
    },
    system: {
      title: data.title || 'System Notification',
      body: data.body || '',
    },
  };

  return {
    ...notifications[type],
    data: { type, ...data },
  };
}

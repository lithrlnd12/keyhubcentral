import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { app, db } from './config';

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

// Send Firebase config to the service worker so it can initialize.
// Service workers cannot access NEXT_PUBLIC_* env vars directly.
async function sendConfigToServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sw = registration.active ?? registration.waiting;
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
  } catch (error) {
    console.error('Failed to send config to service worker:', error);
  }
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

    // Initialize the service worker with Firebase config before requesting token
    await sendConfigToServiceWorker();

    // Get FCM token
    const token = await getToken(messagingInstance, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    });

    if (token) {
      // Save token to user document
      await saveTokenToUser(userId, token);
      return token;
    }

    return null;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
}

// Save FCM token to user document
async function saveTokenToUser(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayUnion(token),
    });
  } catch (error) {
    console.error('Error saving FCM token:', error);
  }
}

// Remove FCM token from user document
export async function removeTokenFromUser(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmTokens: arrayRemove(token),
    });
  } catch (error) {
    console.error('Error removing FCM token:', error);
  }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: NotificationPayload) => void): () => void {
  const messagingInstance = initializeMessaging();
  if (!messagingInstance) {
    return () => {};
  }

  return onMessage(messagingInstance, (payload) => {
    const notificationPayload: NotificationPayload = {
      title: payload.notification?.title || 'KeyHub Central',
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

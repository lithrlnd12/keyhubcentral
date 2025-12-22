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

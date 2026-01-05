import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from './config';
import {
  NotificationPreferences,
  NotificationRecord,
  NotificationType,
  FCMToken,
  getDefaultPreferences,
  isNotificationEnabled,
  isInQuietHours,
  getNotificationTemplate,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
} from '@/types/notifications';

// Get user's notification preferences
export async function getNotificationPreferences(
  userId: string
): Promise<NotificationPreferences | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return null;

    const userData = userDoc.data();
    return userData.notificationPreferences || null;
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return null;
  }
}

// Initialize notification preferences for a user (called on first login or signup)
export async function initializeNotificationPreferences(
  userId: string,
  role: string
): Promise<NotificationPreferences> {
  try {
    const preferences = getDefaultPreferences(role);
    await updateDoc(doc(db, 'users', userId), {
      notificationPreferences: preferences,
    });
    return preferences;
  } catch (error) {
    console.error('Error initializing notification preferences:', error);
    throw error;
  }
}

// Update notification preferences
export async function updateNotificationPreferences(
  userId: string,
  preferences: Partial<NotificationPreferences>
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentPrefs = userDoc.data().notificationPreferences || {};
    const updatedPrefs = deepMerge(currentPrefs, preferences);

    await updateDoc(userRef, {
      notificationPreferences: updatedPrefs,
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
}

// Deep merge helper for nested preferences
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        result[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        ) as T[Extract<keyof T, string>];
      } else {
        result[key] = sourceValue as T[Extract<keyof T, string>];
      }
    }
  }

  return result;
}

// Toggle a specific notification setting
export async function toggleNotificationSetting(
  userId: string,
  category: keyof NotificationPreferences,
  setting: string,
  value: boolean
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      [`notificationPreferences.${category}.${setting}`]: value,
    });
  } catch (error) {
    console.error('Error toggling notification setting:', error);
    throw error;
  }
}

// Toggle master push notifications
export async function togglePushNotifications(
  userId: string,
  enabled: boolean
): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', userId), {
      'notificationPreferences.pushEnabled': enabled,
    });
  } catch (error) {
    console.error('Error toggling push notifications:', error);
    throw error;
  }
}

// Update quiet hours
export async function updateQuietHours(
  userId: string,
  quietHours: { enabled?: boolean; start?: string; end?: string }
): Promise<void> {
  try {
    const updates: Record<string, unknown> = {};

    if (quietHours.enabled !== undefined) {
      updates['notificationPreferences.quietHours.enabled'] = quietHours.enabled;
    }
    if (quietHours.start !== undefined) {
      updates['notificationPreferences.quietHours.start'] = quietHours.start;
    }
    if (quietHours.end !== undefined) {
      updates['notificationPreferences.quietHours.end'] = quietHours.end;
    }

    await updateDoc(doc(db, 'users', userId), updates);
  } catch (error) {
    console.error('Error updating quiet hours:', error);
    throw error;
  }
}

// FCM Token management
export async function saveFCMToken(
  userId: string,
  token: string,
  deviceInfo: { device: 'desktop' | 'mobile'; browser: string }
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const existingTokens: FCMToken[] = userDoc.data().fcmTokens || [];

    // Check if token already exists
    const tokenIndex = existingTokens.findIndex((t) => t.token === token);

    if (tokenIndex >= 0) {
      // Update lastUsedAt for existing token
      existingTokens[tokenIndex].lastUsedAt = Timestamp.now();
      await updateDoc(userRef, { fcmTokens: existingTokens });
    } else {
      // Add new token
      const newToken: FCMToken = {
        token,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        createdAt: Timestamp.now(),
        lastUsedAt: Timestamp.now(),
      };
      await updateDoc(userRef, {
        fcmTokens: arrayUnion(newToken),
      });
    }
  } catch (error) {
    console.error('Error saving FCM token:', error);
    throw error;
  }
}

export async function removeFCMToken(userId: string, token: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return;

    const existingTokens: FCMToken[] = userDoc.data().fcmTokens || [];
    const tokenToRemove = existingTokens.find((t) => t.token === token);

    if (tokenToRemove) {
      await updateDoc(userRef, {
        fcmTokens: arrayRemove(tokenToRemove),
      });
    }
  } catch (error) {
    console.error('Error removing FCM token:', error);
    throw error;
  }
}

// Get user's FCM tokens
export async function getFCMTokens(userId: string): Promise<FCMToken[]> {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) return [];
    return userDoc.data().fcmTokens || [];
  } catch (error) {
    console.error('Error getting FCM tokens:', error);
    return [];
  }
}

// Notification history
export async function getNotificationHistory(
  userId: string,
  limitCount: number = 50
): Promise<NotificationRecord[]> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as NotificationRecord[];
  } catch (error) {
    console.error('Error getting notification history:', error);
    return [];
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'notifications', notificationId), {
      status: 'read',
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

// Mark all notifications as read
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('status', 'in', ['sent', 'delivered'])
    );

    const snapshot = await getDocs(q);
    const batch: Promise<void>[] = [];

    snapshot.docs.forEach((docSnapshot) => {
      batch.push(
        updateDoc(doc(db, 'notifications', docSnapshot.id), {
          status: 'read',
          readAt: serverTimestamp(),
        })
      );
    });

    await Promise.all(batch);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('status', 'in', ['sent', 'delivered'])
    );

    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

// Create a notification (usually called from Cloud Functions, but can be used client-side for testing)
export async function createNotification(
  userId: string,
  type: NotificationType,
  data: Record<string, string>
): Promise<string | null> {
  try {
    // Get user preferences
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      console.error('User not found');
      return null;
    }

    const userData = userDoc.data();
    const preferences = userData.notificationPreferences as NotificationPreferences;

    // Check if notification type is enabled
    if (preferences && !isNotificationEnabled(preferences, type)) {
      console.log(`Notification type ${type} is disabled for user ${userId}`);
      return null;
    }

    // Check quiet hours (except for urgent notifications)
    const priority = NOTIFICATION_PRIORITIES[type];
    if (
      preferences?.quietHours &&
      priority !== 'urgent' &&
      isInQuietHours(preferences.quietHours)
    ) {
      console.log(`In quiet hours, skipping non-urgent notification`);
      return null;
    }

    // Get notification template
    const template = getNotificationTemplate(type, data);

    // Create notification record
    const notification: Omit<NotificationRecord, 'id'> = {
      userId,
      type,
      category: NOTIFICATION_CATEGORIES[type],
      priority,
      title: template.title,
      body: template.body,
      actionUrl: template.actionUrl,
      status: 'pending',
      channels: {
        push: { sent: false },
        email: { sent: false },
      },
      createdAt: Timestamp.now(),
    };

    // Add related entity if provided
    if (data.entityType && data.entityId) {
      notification.relatedEntity = {
        type: data.entityType as 'job' | 'lead' | 'contractor' | 'invoice' | 'user' | 'applicant',
        id: data.entityId,
      };
    }

    const docRef = await addDoc(collection(db, 'notifications'), notification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

// Detect device type
export function detectDeviceType(): 'desktop' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop';

  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'mobile', 'tablet'];

  return mobileKeywords.some((keyword) => userAgent.includes(keyword))
    ? 'mobile'
    : 'desktop';
}

// Detect browser
export function detectBrowser(): string {
  if (typeof window === 'undefined') return 'unknown';

  const userAgent = navigator.userAgent;

  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';

  return 'Other';
}

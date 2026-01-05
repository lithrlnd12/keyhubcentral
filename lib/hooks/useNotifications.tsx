'use client';

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from './useAuth';
import {
  requestNotificationPermission,
  onForegroundMessage,
  NotificationPayload,
} from '@/lib/firebase/messaging';
import {
  initializeNotificationPreferences,
  updateNotificationPreferences,
  toggleNotificationSetting,
  togglePushNotifications,
  updateQuietHours,
  getNotificationHistory,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
} from '@/lib/firebase/notifications';
import {
  NotificationPreferences,
  NotificationRecord,
} from '@/types/notifications';

interface UseNotificationsResult {
  // Basic notifications
  isSupported: boolean;
  permission: NotificationPermission | null;
  token: string | null;
  requestPermission: () => Promise<void>;
  latestNotification: NotificationPayload | null;

  // Preferences
  preferences: NotificationPreferences | null;
  preferencesLoading: boolean;
  updatePreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
  toggleSetting: (
    category: keyof NotificationPreferences,
    setting: string,
    value: boolean
  ) => Promise<void>;
  togglePush: (enabled: boolean) => Promise<void>;
  setQuietHours: (quietHours: {
    enabled?: boolean;
    start?: string;
    end?: string;
  }) => Promise<void>;

  // Notification history
  notifications: NotificationRecord[];
  unreadCount: number;
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<NotificationPayload | null>(null);

  // Preferences state
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [preferencesLoading, setPreferencesLoading] = useState(true);

  // History state
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Check if notifications are supported
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Load preferences with real-time updates
  useEffect(() => {
    if (!user?.uid) {
      setPreferencesLoading(false);
      return;
    }

    setPreferencesLoading(true);

    const unsubscribe = onSnapshot(
      doc(db, 'users', user.uid),
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.notificationPreferences) {
            setPreferences(data.notificationPreferences);
          } else {
            // Initialize preferences if they don't exist
            try {
              const defaultPrefs = await initializeNotificationPreferences(
                user.uid,
                user.role || 'pending'
              );
              setPreferences(defaultPrefs);
            } catch (error) {
              console.error('Error initializing preferences:', error);
            }
          }
        }
        setPreferencesLoading(false);
      },
      (error) => {
        console.error('Error listening to preferences:', error);
        setPreferencesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, user?.role]);

  // Load unread count
  useEffect(() => {
    if (!user?.uid) return;

    const loadUnreadCount = async () => {
      const count = await getUnreadNotificationCount(user.uid);
      setUnreadCount(count);
    };

    loadUnreadCount();

    // Refresh every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  // Listen for foreground messages
  useEffect(() => {
    if (!isSupported || !user) return;

    const unsubscribe = onForegroundMessage((payload) => {
      setLatestNotification(payload);

      // Show browser notification for foreground messages
      if (Notification.permission === 'granted') {
        new Notification(payload.title, {
          body: payload.body,
          icon: payload.icon || '/logo.svg',
        });
      }

      // Refresh unread count
      getUnreadNotificationCount(user.uid).then(setUnreadCount);

      // Clear after 10 seconds
      setTimeout(() => {
        setLatestNotification(null);
      }, 10000);
    });

    return unsubscribe;
  }, [isSupported, user]);

  // Request permission
  const requestPermission = useCallback(async () => {
    if (!isSupported || !user) return;

    const fcmToken = await requestNotificationPermission(user.uid);
    if (fcmToken) {
      setToken(fcmToken);
      setPermission('granted');

      // Enable push in preferences if not already
      if (preferences && !preferences.pushEnabled) {
        await togglePushNotifications(user.uid, true);
      }
    } else {
      setPermission(Notification.permission);
    }
  }, [isSupported, user, preferences]);

  // Auto-request if already granted
  useEffect(() => {
    if (isSupported && permission === 'granted' && user && !token) {
      requestPermission();
    }
  }, [isSupported, permission, user, token, requestPermission]);

  // Update preferences
  const updatePrefs = useCallback(
    async (prefs: Partial<NotificationPreferences>): Promise<void> => {
      if (!user?.uid) return;
      await updateNotificationPreferences(user.uid, prefs);
    },
    [user?.uid]
  );

  // Toggle a specific setting
  const toggleSetting = useCallback(
    async (
      category: keyof NotificationPreferences,
      setting: string,
      value: boolean
    ): Promise<void> => {
      if (!user?.uid) return;
      await toggleNotificationSetting(user.uid, category, setting, value);
    },
    [user?.uid]
  );

  // Toggle push notifications
  const togglePush = useCallback(
    async (enabled: boolean): Promise<void> => {
      if (!user?.uid) return;

      if (enabled && permission !== 'granted') {
        await requestPermission();
        return;
      }

      await togglePushNotifications(user.uid, enabled);
    },
    [user?.uid, permission, requestPermission]
  );

  // Set quiet hours
  const setQuietHours = useCallback(
    async (quietHours: { enabled?: boolean; start?: string; end?: string }): Promise<void> => {
      if (!user?.uid) return;
      await updateQuietHours(user.uid, quietHours);
    },
    [user?.uid]
  );

  // Load notification history
  const loadNotifications = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;
    const history = await getNotificationHistory(user.uid);
    setNotifications(history);
  }, [user?.uid]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string): Promise<void> => {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, status: 'read' } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    },
    []
  );

  // Mark all as read
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!user?.uid) return;
    await markAllNotificationsAsRead(user.uid);
    setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' as const })));
    setUnreadCount(0);
  }, [user?.uid]);

  return {
    isSupported,
    permission,
    token,
    requestPermission,
    latestNotification,
    preferences,
    preferencesLoading,
    updatePreferences: updatePrefs,
    toggleSetting,
    togglePush,
    setQuietHours,
    notifications,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  };
}

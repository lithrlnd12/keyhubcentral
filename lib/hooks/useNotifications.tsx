'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import {
  requestNotificationPermission,
  onForegroundMessage,
  NotificationPayload,
} from '@/lib/firebase/messaging';

interface UseNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission | null;
  token: string | null;
  requestPermission: () => Promise<void>;
  latestNotification: NotificationPayload | null;
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [latestNotification, setLatestNotification] = useState<NotificationPayload | null>(null);

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
    } else {
      setPermission(Notification.permission);
    }
  }, [isSupported, user]);

  // Auto-request if already granted
  useEffect(() => {
    if (isSupported && permission === 'granted' && user && !token) {
      requestPermission();
    }
  }, [isSupported, permission, user, token, requestPermission]);

  return {
    isSupported,
    permission,
    token,
    requestPermission,
    latestNotification,
  };
}

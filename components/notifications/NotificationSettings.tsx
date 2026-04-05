'use client';

import { useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks';
import { requestNotificationPermission } from '@/lib/firebase/messaging';
import { togglePushNotifications, removeFCMToken, getFCMTokens } from '@/lib/firebase/notifications';

/**
 * Compact notification toggle for profile pages.
 * Enable triggers browser permission + token save.
 * Disable removes tokens + sets pushEnabled false.
 */
export function NotificationSettings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'enabling' | 'enabled' | 'disabled' | 'error'>('idle');

  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const browserPermission = typeof window !== 'undefined' && 'Notification' in window
    ? Notification.permission
    : 'default';

  const handleEnable = async () => {
    if (!user?.uid) return;
    setStatus('enabling');
    try {
      const token = await requestNotificationPermission(user.uid);
      if (token) {
        await togglePushNotifications(user.uid, true);
        setStatus('enabled');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleDisable = async () => {
    if (!user?.uid) return;
    try {
      const tokens = await getFCMTokens(user.uid);
      for (const t of tokens) {
        await removeFCMToken(user.uid, t.token);
      }
      await togglePushNotifications(user.uid, false);
    } catch { /* still mark disabled */ }
    setStatus('disabled');
  };

  if (!isSupported) {
    return (
      <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <BellOff className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-white">Push Notifications</h3>
        </div>
        <p className="text-sm text-gray-400">
          Not supported in this browser. Try Chrome, Firefox, or Edge.
        </p>
      </div>
    );
  }

  const showAsEnabled = status === 'enabled' || (status === 'idle' && browserPermission === 'granted');

  return (
    <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-4">
        {showAsEnabled ? (
          <Bell className="w-5 h-5 text-brand-gold" />
        ) : (
          <BellOff className="w-5 h-5 text-gray-500" />
        )}
        <h3 className="font-semibold text-white">Push Notifications</h3>
      </div>

      {browserPermission === 'denied' && status !== 'enabled' ? (
        <p className="text-sm text-gray-400">
          Notifications are blocked. Enable them in your browser settings.
        </p>
      ) : showAsEnabled ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-green-400">
            <Check className="w-4 h-4" />
            <span className="text-sm">Notifications enabled</span>
          </div>
          <Button onClick={handleDisable} variant="outline" size="sm">
            Disable
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Get real-time alerts for messages, jobs, leads, and more.
          </p>
          <Button
            onClick={handleEnable}
            size="sm"
            disabled={status === 'enabling'}
          >
            <Bell className="w-4 h-4 mr-2" />
            {status === 'enabling' ? 'Enabling...' : 'Enable Notifications'}
          </Button>
          {status === 'error' && (
            <p className="text-sm text-red-400">Could not enable. Try again.</p>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Bell, BellOff, Check } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks';
import { requestNotificationPermission } from '@/lib/firebase/messaging';
import { togglePushNotifications, removeFCMToken, getFCMTokens } from '@/lib/firebase/notifications';

export function NotificationSettings() {
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'enabling' | 'enabled' | 'disabled' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Check current state on mount
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
    setErrorMsg('');

    try {
      const token = await requestNotificationPermission(user.uid);
      if (token) {
        await togglePushNotifications(user.uid, true);
        setStatus('enabled');
      } else {
        // Permission denied or failed
        if (Notification.permission === 'denied') {
          setErrorMsg('Notifications blocked. Check your browser settings.');
        } else {
          setErrorMsg('Could not enable notifications. Try again.');
        }
        setStatus('error');
      }
    } catch {
      setErrorMsg('Something went wrong. Try again.');
      setStatus('error');
    }
  };

  const handleDisable = async () => {
    if (!user?.uid) return;

    try {
      // Remove all FCM tokens so Cloud Functions can't send to this device
      const tokens = await getFCMTokens(user.uid);
      for (const t of tokens) {
        await removeFCMToken(user.uid, t.token);
      }
      await togglePushNotifications(user.uid, false);
      setStatus('disabled');
    } catch {
      // Still mark as disabled locally
      setStatus('disabled');
    }
  };

  if (!isSupported) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-gray-500" />
          <div>
            <CardTitle>Push Notifications</CardTitle>
            <p className="text-sm text-gray-400 mt-1">
              Not supported in this browser. Try Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show enabled state if we just enabled, or if browser already granted
  const showAsEnabled = status === 'enabled' || (status === 'idle' && browserPermission === 'granted');
  const showAsDenied = browserPermission === 'denied' && status !== 'enabled';

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {showAsEnabled ? (
            <Bell className="w-5 h-5 text-brand-gold" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-500" />
          )}
          <div>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>
              {showAsEnabled
                ? 'Notifications are on for this device'
                : 'Enable to receive real-time alerts on this device'}
            </CardDescription>
          </div>
        </div>

        {showAsDenied ? (
          <p className="text-sm text-red-400 ml-4 text-right">
            Blocked by browser.<br />
            <span className="text-xs text-gray-500">Check browser settings</span>
          </p>
        ) : showAsEnabled ? (
          <Button onClick={handleDisable} size="sm" variant="outline">
            Disable
          </Button>
        ) : (
          <Button
            onClick={handleEnable}
            size="sm"
            variant="primary"
            disabled={status === 'enabling'}
          >
            {status === 'enabling' ? 'Enabling...' : 'Enable'}
          </Button>
        )}
      </div>

      {status === 'enabled' && (
        <div className="flex items-center gap-2 text-green-400 mt-3">
          <Check className="w-4 h-4" />
          <span className="text-sm">Notifications enabled successfully</span>
        </div>
      )}

      {status === 'error' && errorMsg && (
        <p className="text-sm text-red-400 mt-3">{errorMsg}</p>
      )}
    </Card>
  );
}

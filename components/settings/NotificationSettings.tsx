'use client';

import { Bell, BellOff } from 'lucide-react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/lib/hooks';

export function NotificationSettings() {
  const {
    isSupported,
    permission,
    preferences,
    preferencesLoading,
    requestPermission,
    togglePush,
  } = useNotifications();

  const isEnabled = preferences?.pushEnabled && permission === 'granted';

  const handleToggle = () => {
    if (isEnabled) {
      togglePush(false);
    } else {
      // Triggers browser permission dialog, saves token on grant
      requestPermission();
    }
  };

  if (preferencesLoading) {
    return (
      <Card>
        <div className="animate-pulse flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-5 bg-gray-700 rounded w-40"></div>
            <div className="h-4 bg-gray-700 rounded w-64"></div>
          </div>
          <div className="h-10 w-24 bg-gray-700 rounded-lg"></div>
        </div>
      </Card>
    );
  }

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

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isEnabled ? (
            <Bell className="w-5 h-5 text-brand-gold" />
          ) : (
            <BellOff className="w-5 h-5 text-gray-500" />
          )}
          <div>
            <CardTitle>Push Notifications</CardTitle>
            <CardDescription>
              {isEnabled
                ? 'You will receive alerts for messages, leads, jobs, and more'
                : 'Enable to receive real-time alerts on this device'}
            </CardDescription>
          </div>
        </div>

        {permission === 'denied' ? (
          <p className="text-sm text-red-400 ml-4 text-right">
            Blocked by browser.<br />
            <span className="text-xs text-gray-500">Check browser settings</span>
          </p>
        ) : (
          <Button
            onClick={handleToggle}
            size="sm"
            variant={isEnabled ? 'outline' : 'primary'}
          >
            {isEnabled ? 'Disable' : 'Enable'}
          </Button>
        )}
      </div>
    </Card>
  );
}

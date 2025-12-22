'use client';

import { Bell, BellOff, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/lib/hooks';

export function NotificationSettings() {
  const { isSupported, permission, requestPermission } = useNotifications();

  if (!isSupported) {
    return (
      <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800">
        <div className="flex items-center gap-3 mb-4">
          <BellOff className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-white">Push Notifications</h3>
        </div>
        <p className="text-sm text-gray-400">
          Push notifications are not supported in your browser. Try using a modern browser like
          Chrome, Firefox, or Edge.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="w-5 h-5 text-brand-gold" />
        <h3 className="font-semibold text-white">Push Notifications</h3>
      </div>

      {permission === 'granted' ? (
        <div className="flex items-center gap-2 text-green-400">
          <Check className="w-4 h-4" />
          <span className="text-sm">Notifications enabled</span>
        </div>
      ) : permission === 'denied' ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            Notifications are blocked. Please enable them in your browser settings to receive
            updates about:
          </p>
          <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
            <li>New leads and assignments</li>
            <li>Job status updates</li>
            <li>Invoice payments</li>
            <li>Important system alerts</li>
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Enable push notifications to receive real-time updates about:
          </p>
          <ul className="text-sm text-gray-500 list-disc list-inside space-y-1">
            <li>New leads and assignments</li>
            <li>Job status updates</li>
            <li>Invoice payments</li>
            <li>Important system alerts</li>
          </ul>
          <Button onClick={requestPermission} size="sm">
            <Bell className="w-4 h-4 mr-2" />
            Enable Notifications
          </Button>
        </div>
      )}
    </div>
  );
}

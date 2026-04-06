'use client';

import { useState, useEffect } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks';
import { useNotifications } from '@/lib/hooks';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * Shows a one-time prompt asking the user to enable push notifications.
 * Appears after first login on any device where notifications aren't yet enabled.
 * Dismisses permanently when the user chooses Enable or Not Now.
 */
export function NotificationPrompt() {
  const { user } = useAuth();
  const { isSupported, permission, requestPermission, preferences } = useNotifications();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    if (!isSupported) return;
    if (permission === 'granted' || permission === 'denied') return;
    if (user.notificationPromptDismissed) return;
    if (preferences?.pushEnabled) return;

    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [user, isSupported, permission, preferences]);

  const dismiss = async () => {
    setVisible(false);
    if (user?.uid) {
      await updateDoc(doc(db, 'users', user.uid), {
        notificationPromptDismissed: true,
      });
    }
  };

  const handleEnable = async () => {
    // Dismiss modal first, then trigger browser permission dialog
    setVisible(false);
    if (user?.uid) {
      updateDoc(doc(db, 'users', user.uid), {
        notificationPromptDismissed: true,
      });
    }
    // Browser dialog appears after modal is gone
    requestPermission();
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-brand-charcoal border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center justify-center w-12 h-12 bg-brand-gold/10 rounded-full">
            <Bell className="w-6 h-6 text-brand-gold" />
          </div>
          <button
            onClick={dismiss}
            className="text-gray-500 hover:text-gray-300 -mt-1 -mr-1 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-semibold text-white mb-2">
          Stay in the loop
        </h3>
        <p className="text-sm text-gray-400 mb-6">
          Get notified about new messages, job assignments, leads, and important
          updates — even when the app is in the background.
        </p>

        <div className="flex gap-3">
          <Button
            onClick={dismiss}
            variant="outline"
            className="flex-1"
          >
            Not Now
          </Button>
          <Button
            onClick={handleEnable}
            variant="primary"
            className="flex-1"
          >
            Enable
          </Button>
        </div>
      </div>
    </div>
  );
}

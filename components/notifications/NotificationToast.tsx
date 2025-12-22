'use client';

import { useEffect, useState } from 'react';
import { X, Bell } from 'lucide-react';
import { NotificationPayload } from '@/lib/firebase/messaging';
import { cn } from '@/lib/utils';

interface NotificationToastProps {
  notification: NotificationPayload | null;
  onDismiss: () => void;
}

export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);

      // Auto-dismiss after 8 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for animation
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-[100] max-w-sm w-full bg-brand-charcoal border border-gray-700 rounded-xl shadow-2xl transition-all duration-300',
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-brand-gold/10 rounded-lg">
            <Bell className="w-5 h-5 text-brand-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-white truncate">{notification.title}</p>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{notification.body}</p>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, CheckCheck, X, AlertCircle, Briefcase, DollarSign, Users, FileText } from 'lucide-react';
import { useNotifications } from '@/lib/hooks';
import { NotificationRecord, NotificationCategory } from '@/types/notifications';
import { Spinner } from '@/components/ui/Spinner';

const CATEGORY_ICONS: Record<NotificationCategory, React.ElementType> = {
  compliance: FileText,
  jobs: Briefcase,
  leads: Users,
  financial: DollarSign,
  admin: AlertCircle,
};

const CATEGORY_COLORS: Record<NotificationCategory, string> = {
  compliance: 'bg-yellow-500/20 text-yellow-400',
  jobs: 'bg-blue-500/20 text-blue-400',
  leads: 'bg-green-500/20 text-green-400',
  financial: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-red-500/20 text-red-400',
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'border-l-4 border-l-red-500',
  high: 'border-l-4 border-l-orange-500',
  medium: 'border-l-4 border-l-yellow-500',
  low: '',
};

function formatTimeAgo(timestamp: { toDate: () => Date }): string {
  const date = timestamp.toDate();
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NotificationDropdown() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Load notifications when dropdown opens
  const handleToggle = async () => {
    if (!isOpen) {
      setLoading(true);
      await loadNotifications();
      setLoading(false);
    }
    setIsOpen(!isOpen);
  };

  // Handle notification click
  const handleNotificationClick = async (notification: NotificationRecord) => {
    // Mark as read if unread
    if (notification.status !== 'read') {
      await markAsRead(notification.id);
    }

    // Navigate to action URL
    if (notification.actionUrl) {
      setIsOpen(false);
      router.push(notification.actionUrl);
    }
  };

  // Handle mark all as read
  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={handleToggle}
        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors relative"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-brand-gold text-black rounded-full px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-brand-charcoal border border-gray-800 rounded-xl shadow-xl overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <h3 className="font-semibold text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-gold hover:text-gold/80 flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <Spinner size="md" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center">
                <Bell className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-800">
                {notifications.map((notification) => {
                  const Icon = CATEGORY_ICONS[notification.category];
                  const isUnread = notification.status !== 'read';

                  return (
                    <button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-800/50 transition-colors ${
                        PRIORITY_STYLES[notification.priority]
                      } ${isUnread ? 'bg-gray-800/30' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className={`p-2 rounded-lg flex-shrink-0 ${CATEGORY_COLORS[notification.category]}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm font-medium truncate ${isUnread ? 'text-white' : 'text-gray-300'}`}>
                              {notification.title}
                            </p>
                            {isUnread && (
                              <span className="w-2 h-2 bg-brand-gold rounded-full flex-shrink-0 mt-1.5" />
                            )}
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">
                            {notification.body}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-800">
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push('/settings');
                }}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                Manage notification settings
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

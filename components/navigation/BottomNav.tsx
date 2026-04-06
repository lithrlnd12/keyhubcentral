'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Wrench,
  Briefcase,
  Users,
  MessageSquare,
  Bell,
  Menu,
  MapPin,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth, useTranslation } from '@/lib/hooks';
import { useUnreadMessageCount } from '@/lib/hooks/useMessages';
import { useNotifications } from '@/lib/hooks';
import { BottomSheet } from './BottomSheet';
import { MoreMenu } from './MoreMenu';
import { NotificationRecord } from '@/types/notifications';

// Role-specific config for Home and Work tabs
function getTabConfig(role: string) {
  switch (role) {
    case 'contractor':
      return {
        homeHref: '/portal',
        workHref: '/portal/leads',
        workLabel: 'Jobs',
        workIcon: Target,
      };
    case 'partner':
      return {
        homeHref: '/partner',
        workHref: '/partner/labor-requests',
        workLabel: 'Requests',
        workIcon: Wrench,
      };
    case 'subscriber':
      return {
        homeHref: '/subscriber',
        workHref: '/subscriber/leads',
        workLabel: 'Leads',
        workIcon: Users,
      };
    case 'customer':
      return {
        homeHref: '/customer/dashboard',
        workHref: '/customer/find',
        workLabel: 'Find Pros',
        workIcon: MapPin,
      };
    default:
      return {
        homeHref: '/overview',
        workHref: '/kts',
        workLabel: 'Work',
        workIcon: Wrench,
      };
  }
}

// Time-ago helper
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Priority dot colors
const PRIORITY_DOT: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  medium: 'bg-yellow-400',
  low: 'bg-gray-500',
};

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const unreadMessages = useUnreadMessageCount();
  const {
    notifications,
    unreadCount: unreadNotifications,
    loadNotifications,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const handleAlertsOpen = useCallback(() => {
    setAlertsOpen(true);
    loadNotifications();
  }, [loadNotifications]);

  if (!user?.role) return null;

  const config = getTabConfig(user.role);

  const tabs = [
    {
      key: 'home',
      label: 'Home',
      icon: LayoutDashboard,
      href: config.homeHref,
      badge: 0,
    },
    {
      key: 'work',
      label: config.workLabel,
      icon: config.workIcon,
      href: config.workHref,
      badge: 0,
    },
    {
      key: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      href: '/messages',
      badge: unreadMessages,
    },
    {
      key: 'alerts',
      label: 'Alerts',
      icon: Bell,
      badge: unreadNotifications,
      action: handleAlertsOpen,
    },
    {
      key: 'more',
      label: 'More',
      icon: Menu,
      badge: 0,
      action: () => setMoreOpen(true),
    },
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-black border-t border-gray-800 z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-16">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.href
              ? pathname.startsWith(tab.href)
              : tab.key === 'alerts'
              ? alertsOpen
              : tab.key === 'more'
              ? moreOpen
              : false;

            const commonClasses = cn(
              'flex flex-col items-center justify-center flex-1 h-full px-1 transition-colors',
              isActive ? 'text-brand-gold' : 'text-gray-500'
            );

            const inner = (
              <>
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {tab.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] bg-brand-gold rounded-full text-[10px] font-bold text-brand-black flex items-center justify-center px-1">
                      {tab.badge > 99 ? '99+' : tab.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium mt-1">{t(tab.label)}</span>
              </>
            );

            if (tab.action) {
              return (
                <button key={tab.key} onClick={tab.action} className={commonClasses}>
                  {inner}
                </button>
              );
            }

            return (
              <Link key={tab.key} href={tab.href!} className={commonClasses}>
                {inner}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Alerts Sheet */}
      <BottomSheet isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} title="Notifications">
        <AlertsList
          notifications={notifications}
          onRead={(id) => markAsRead(id)}
          onMarkAllRead={markAllAsRead}
          onClose={() => setAlertsOpen(false)}
        />
      </BottomSheet>

      {/* More Sheet */}
      <BottomSheet isOpen={moreOpen} onClose={() => setMoreOpen(false)} title="Menu">
        <MoreMenu onClose={() => setMoreOpen(false)} />
      </BottomSheet>
    </>
  );
}

// Inline alerts list component
function AlertsList({
  notifications,
  onRead,
  onMarkAllRead,
  onClose,
}: {
  notifications: NotificationRecord[];
  onRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClose: () => void;
}) {
  const hasUnread = notifications.some((n) => n.status !== 'read');

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <Bell className="w-10 h-10 mb-3 opacity-30" />
        <p className="text-sm">No notifications yet</p>
      </div>
    );
  }

  return (
    <div>
      {hasUnread && (
        <button
          onClick={onMarkAllRead}
          className="text-xs text-brand-gold font-medium px-3 py-1.5 mb-2 active:opacity-70"
        >
          Mark all as read
        </button>
      )}
      <div className="space-y-1">
        {notifications.map((notification) => {
          const isUnread = notification.status !== 'read';
          const createdAt = notification.createdAt?.toDate?.();

          return (
            <Link
              key={notification.id}
              href={notification.actionUrl || '/overview'}
              onClick={() => {
                if (isUnread) onRead(notification.id);
                onClose();
              }}
              className={cn(
                'flex items-start gap-3 px-3 py-3 rounded-xl transition-colors',
                isUnread ? 'bg-white/[0.03]' : 'opacity-60'
              )}
            >
              {/* Priority dot */}
              <div className="pt-1.5 flex-shrink-0">
                <div className={cn('w-2 h-2 rounded-full', PRIORITY_DOT[notification.priority] || 'bg-gray-500')} />
              </div>

              <div className="flex-1 min-w-0">
                <p className={cn('text-sm leading-tight', isUnread ? 'text-white font-medium' : 'text-gray-400')}>
                  {notification.title}
                </p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notification.body}</p>
                {createdAt && (
                  <p className="text-[10px] text-gray-600 mt-1">{timeAgo(createdAt)}</p>
                )}
              </div>

              {isUnread && (
                <div className="w-2 h-2 rounded-full bg-brand-gold flex-shrink-0 mt-2" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

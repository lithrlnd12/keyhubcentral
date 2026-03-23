'use client';

import Link from 'next/link';
import { MessageSquare, Phone, Bell } from 'lucide-react';
import { useUnreadMessageCount, useNewCallsCount, useNotifications } from '@/lib/hooks';

export function CommunicationPulse() {
  const unreadMessages = useUnreadMessageCount();
  const { count: newCalls } = useNewCallsCount();
  const { unreadCount: unreadNotifications } = useNotifications();

  const total = unreadMessages + newCalls + unreadNotifications;
  if (total === 0) return null;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {unreadMessages > 0 && (
        <Link
          href="/messages"
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 hover:border-blue-500/50 transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">
            {unreadMessages} unread message{unreadMessages !== 1 ? 's' : ''}
          </span>
        </Link>
      )}
      {newCalls > 0 && (
        <Link
          href="/kts/calls"
          className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 hover:border-green-500/50 transition-colors"
        >
          <Phone className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">
            {newCalls} new call{newCalls !== 1 ? 's' : ''}
          </span>
        </Link>
      )}
      {unreadNotifications > 0 && (
        <Link
          href="/notifications"
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg text-purple-400 hover:border-purple-500/50 transition-colors"
        >
          <Bell className="w-3.5 h-3.5" />
          <span className="text-sm font-medium">
            {unreadNotifications} notification{unreadNotifications !== 1 ? 's' : ''}
          </span>
        </Link>
      )}
    </div>
  );
}

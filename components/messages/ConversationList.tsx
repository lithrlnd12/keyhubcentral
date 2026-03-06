'use client';

import { useRouter } from 'next/navigation';
import { Pencil, Users, User, MessageSquarePlus, Briefcase } from 'lucide-react';
import { useAuth } from '@/lib/hooks';
import { useConversations } from '@/lib/hooks/useMessages';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/message';

function timeAgo(timestamp: { toDate: () => Date } | null): string {
  if (!timestamp) return '';
  const now = new Date();
  const date = timestamp.toDate();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ConversationItem({
  conversation,
  currentUserId,
  isActive,
  onClick,
}: {
  conversation: Conversation;
  currentUserId: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const unread = conversation.unreadCount?.[currentUserId] || 0;
  const lastMsg = conversation.lastMessage;

  // Display name: group name, or the other person's name for 1:1
  const displayName =
    conversation.type === 'group'
      ? conversation.groupName || 'Group Chat'
      : Object.entries(conversation.participantNames)
          .filter(([uid]) => uid !== currentUserId)
          .map(([, name]) => name)
          .join(', ') || 'Unknown';

  const participantCount = conversation.participants.length;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
        isActive ? 'bg-gray-800' : 'hover:bg-gray-800/50',
        unread > 0 && 'bg-gray-800/30'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
        conversation.jobId ? 'bg-blue-500/20' : conversation.type === 'group' ? 'bg-brand-gold/20' : 'bg-gray-700'
      )}>
        {conversation.jobId ? (
          <Briefcase className="w-5 h-5 text-blue-400" />
        ) : conversation.type === 'group' ? (
          <Users className="w-5 h-5 text-brand-gold" />
        ) : (
          <User className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className={cn(
            'text-sm truncate',
            unread > 0 ? 'text-white font-semibold' : 'text-gray-200 font-medium'
          )}>
            {displayName}
          </span>
          <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
            {timeAgo(lastMsg?.timestamp as any)}
          </span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className={cn(
            'text-sm truncate',
            unread > 0 ? 'text-gray-300' : 'text-gray-500'
          )}>
            {lastMsg
              ? `${lastMsg.senderId === currentUserId ? 'You: ' : ''}${lastMsg.text}`
              : 'No messages yet'}
          </p>
          {unread > 0 && (
            <span className="flex-shrink-0 ml-2 bg-brand-gold text-brand-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </div>
        {conversation.type === 'group' && (
          <p className="text-xs text-gray-600 mt-0.5">{participantCount} members</p>
        )}
      </div>
    </button>
  );
}

export function ConversationList({ activeId }: { activeId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { conversations, loading } = useConversations();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-brand-gold border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <h2 className="text-lg font-semibold text-white">Messages</h2>
        <button
          onClick={() => router.push('/messages/new')}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors text-brand-gold"
          title="New message"
        >
          <MessageSquarePlus className="w-5 h-5" />
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 px-4">
            <MessageSquarePlus className="w-8 h-8 mb-2" />
            <p className="text-sm text-center">No conversations yet</p>
            <button
              onClick={() => router.push('/messages/new')}
              className="mt-3 text-sm text-brand-gold hover:underline"
            >
              Start a conversation
            </button>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              currentUserId={user?.uid || ''}
              isActive={conv.id === activeId}
              onClick={() => router.push(`/messages/${conv.id}`)}
            />
          ))
        )}
      </div>

      {/* FAB - Google Messages style compose button */}
      <button
        onClick={() => router.push('/messages/new')}
        className="absolute bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-brand-gold text-brand-black rounded-full shadow-lg shadow-brand-gold/25 flex items-center justify-center hover:bg-brand-gold-light active:scale-95 transition-all z-10"
        aria-label="New message"
      >
        <Pencil className="w-6 h-6" />
      </button>
    </div>
  );
}

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Users, User, MessageSquarePlus, Briefcase, Wrench, Archive, Trash2, Globe } from 'lucide-react';
import { useAuth } from '@/lib/hooks';
import { useConversations } from '@/lib/hooks/useMessages';
import { deleteConversation, archiveConversation } from '@/lib/firebase/messages';
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

const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 160;

function ConversationItem({
  conversation,
  currentUserId,
  isActive,
  onClick,
  onContextMenu,
  onArchive,
  onDelete,
}: {
  conversation: Conversation;
  currentUserId: string;
  isActive: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const unread = conversation.unreadCount?.[currentUserId] || 0;
  const lastMsg = conversation.lastMessage;

  // Swipe state
  const [offsetX, setOffsetX] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isHorizontalSwipe = useRef<boolean | null>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const displayName = conversation.crossTenant
    ? 'Network Job Communication'
    : conversation.type === 'group'
      ? conversation.groupName || 'Group Chat'
      : Object.entries(conversation.participantNames)
          .filter(([uid]) => uid !== currentUserId)
          .map(([, name]) => name)
          .join(', ') || 'Unknown';

  const participantCount = conversation.participants.length;

  // --- Touch handlers for swipe ---
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isHorizontalSwipe.current = null;
    setSwiping(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!swiping) return;

    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;

    if (isHorizontalSwipe.current === null) {
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isHorizontalSwipe.current = Math.abs(dx) > Math.abs(dy);
      }
      return;
    }

    if (!isHorizontalSwipe.current) return;
    e.preventDefault();

    const startOffset = revealed ? -ACTION_WIDTH : 0;
    const raw = startOffset + dx;
    setOffsetX(Math.max(-ACTION_WIDTH, Math.min(0, raw)));
  }, [swiping, revealed]);

  const handleTouchEnd = useCallback(() => {
    setSwiping(false);
    isHorizontalSwipe.current = null;

    if (offsetX < -SWIPE_THRESHOLD) {
      setOffsetX(-ACTION_WIDTH);
      setRevealed(true);
    } else {
      setOffsetX(0);
      setRevealed(false);
    }
  }, [offsetX]);

  // Close swipe on outside tap
  useEffect(() => {
    if (!revealed) return;
    const handleOutside = (e: MouseEvent | TouchEvent) => {
      if (itemRef.current && !itemRef.current.contains(e.target as Node)) {
        setOffsetX(0);
        setRevealed(false);
      }
    };
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [revealed]);

  return (
    <div ref={itemRef} className="relative overflow-hidden">
      {/* Action buttons behind (revealed on swipe) - mobile only */}
      <div className="absolute inset-y-0 right-0 flex md:hidden">
        <button
          onClick={(e) => { e.stopPropagation(); onArchive(); }}
          className="w-20 flex flex-col items-center justify-center bg-green-600 text-white text-xs font-medium gap-1"
        >
          <Archive className="w-5 h-5" />
          Archive
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-20 flex flex-col items-center justify-center bg-red-600 text-white text-xs font-medium gap-1"
        >
          <Trash2 className="w-5 h-5" />
          Delete
        </button>
      </div>

      {/* Swipeable content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={onContextMenu}
        onClick={() => {
          if (revealed) {
            setOffsetX(0);
            setRevealed(false);
          } else {
            onClick();
          }
        }}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: swiping ? 'none' : 'transform 0.25s ease-out',
        }}
        className={cn(
          'relative flex items-center gap-3 px-4 py-3 text-left cursor-pointer bg-brand-black',
          isActive ? 'bg-gray-800' : 'hover:bg-gray-800/50',
          unread > 0 && 'bg-gray-800/30'
        )}
      >
        {/* Avatar */}
        <div className={cn(
          'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center',
          conversation.crossTenant ? 'bg-purple-500/20' :
          conversation.jobId ? 'bg-blue-500/20' :
          conversation.requestId ? 'bg-orange-500/20' :
          conversation.type === 'group' ? 'bg-brand-gold/20' : 'bg-gray-700'
        )}>
          {conversation.crossTenant ? (
            <Globe className="w-5 h-5 text-purple-400" />
          ) : conversation.jobId ? (
            <Briefcase className="w-5 h-5 text-blue-400" />
          ) : conversation.requestId ? (
            <Wrench className="w-5 h-5 text-orange-400" />
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
          {conversation.complaintCallId && (
            <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400">
              Complaint
            </span>
          )}
          {conversation.type === 'group' && (
            <p className="text-xs text-gray-600 mt-0.5">{participantCount} members</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function ConversationList({ activeId }: { activeId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const { conversations, loading } = useConversations();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; convId: string } | null>(null);

  // Close context menu on any click or scroll
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [contextMenu]);

  const handleContextMenu = useCallback((e: React.MouseEvent, convId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, convId });
  }, []);

  const handleArchive = async (convId: string) => {
    if (!user?.uid) return;
    await archiveConversation(convId, user.uid);
  };

  const handleDelete = (convId: string) => {
    setConfirmDelete(convId);
  };

  const confirmDeleteAction = async () => {
    if (!confirmDelete) return;
    await deleteConversation(confirmDelete);
    setConfirmDelete(null);
    if (confirmDelete === activeId) {
      router.push('/messages');
    }
  };

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
              onContextMenu={(e) => handleContextMenu(e, conv.id)}
              onArchive={() => handleArchive(conv.id)}
              onDelete={() => handleDelete(conv.id)}
            />
          ))
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => router.push('/messages/new')}
        className="absolute bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 bg-brand-gold text-brand-black rounded-full shadow-lg shadow-brand-gold/25 flex items-center justify-center hover:bg-brand-gold-light active:scale-95 transition-all z-10"
        aria-label="New message"
      >
        <Pencil className="w-6 h-6" />
      </button>

      {/* Right-click context menu (rendered at list level, outside overflow containers) */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              handleArchive(contextMenu.convId);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-200 hover:bg-gray-800 transition-colors"
          >
            <Archive className="w-4 h-4 text-green-400" />
            Archive
          </button>
          <button
            onClick={() => {
              handleDelete(contextMenu.convId);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-gray-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-semibold text-white mb-2">Delete conversation?</h3>
            <p className="text-sm text-gray-400 mb-6">
              This will permanently delete this conversation and all its messages. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 text-gray-300 text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteAction}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-500 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

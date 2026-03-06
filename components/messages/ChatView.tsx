'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Send, Users, Loader2, ChevronUp, Check, CheckCheck, UserPlus } from 'lucide-react';
import { useAuth } from '@/lib/hooks';
import { useChat } from '@/lib/hooks/useMessages';
import { toggleReaction } from '@/lib/firebase/messages';
import { cn } from '@/lib/utils';
import type { Conversation, Message } from '@/types/message';
import { AddPeopleSheet } from './AddPeopleSheet';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

function ReactionPicker({
  onSelect,
  onClose,
  position,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position: 'left' | 'right';
}) {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className={cn(
        'absolute bottom-full mb-1 flex items-center gap-0.5 bg-gray-800 border border-gray-700 rounded-full px-1.5 py-1 shadow-lg z-10',
        position === 'right' ? 'right-0' : 'left-0'
      )}
    >
      {REACTION_EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => {
            onSelect(emoji);
            onClose();
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-700 active:scale-110 transition-all text-lg"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

function ReactionBar({
  reactions,
  userId,
  onToggle,
}: {
  reactions: Record<string, string[]>;
  userId: string;
  onToggle: (emoji: string) => void;
}) {
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0);
  if (entries.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-0.5 px-1">
      {entries.map(([emoji, users]) => {
        const isMine = users.includes(userId);
        return (
          <button
            key={emoji}
            onClick={() => onToggle(emoji)}
            className={cn(
              'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs transition-colors',
              isMine
                ? 'bg-brand-gold/20 border border-brand-gold/30'
                : 'bg-gray-800 border border-gray-700 hover:bg-gray-700'
            )}
          >
            <span className="text-sm">{emoji}</span>
            {users.length > 1 && (
              <span className={cn('text-[10px] font-medium', isMine ? 'text-brand-gold' : 'text-gray-400')}>
                {users.length}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function MessageBubble({
  message,
  isMine,
  showSender,
  conversationId,
  userId,
  participants,
  isLastMine,
}: {
  message: Message;
  isMine: boolean;
  showSender: boolean;
  conversationId: string;
  userId: string;
  participants: string[];
  isLastMine: boolean;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const time = message.timestamp?.toDate?.()
    ? message.timestamp.toDate().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

  const handleReaction = async (emoji: string) => {
    await toggleReaction(conversationId, message.id, emoji, userId);
  };

  // Double-tap to react (mobile-friendly)
  const lastTap = useRef(0);
  const handleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap — quick react with thumbs up
      handleReaction('👍');
      lastTap.current = 0;
    } else {
      lastTap.current = now;
    }
  };

  // Long press to open picker
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowPicker(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const reactions = message.reactions || {};

  return (
    <div className={cn('flex flex-col mb-1.5', isMine ? 'items-end' : 'items-start')}>
      {showSender && !isMine && (
        <span className="text-xs text-gray-500 ml-3 mb-0.5">{message.senderName}</span>
      )}
      <div className="relative">
        <div
          onClick={handleTap}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onContextMenu={(e) => {
            e.preventDefault();
            setShowPicker(true);
          }}
          className={cn(
            'max-w-[80%] px-3 py-2 rounded-2xl text-sm break-words cursor-pointer select-none',
            isMine
              ? 'bg-brand-gold text-brand-black rounded-br-md'
              : 'bg-gray-800 text-gray-100 rounded-bl-md'
          )}
        >
          {message.text}
        </div>

        {showPicker && (
          <ReactionPicker
            onSelect={handleReaction}
            onClose={() => setShowPicker(false)}
            position={isMine ? 'right' : 'left'}
          />
        )}
      </div>

      <ReactionBar reactions={reactions} userId={userId} onToggle={handleReaction} />
      <div className="flex items-center gap-1 mt-0.5 px-1">
        <span className="text-[10px] text-gray-600">{time}</span>
        {isMine && isLastMine && (
          (() => {
            const otherParticipants = participants.filter((p) => p !== userId);
            const allRead = otherParticipants.length > 0 &&
              otherParticipants.every((p) => message.readBy?.includes(p));
            return allRead ? (
              <CheckCheck className="w-3 h-3 text-brand-gold" />
            ) : (
              <Check className="w-3 h-3 text-gray-600" />
            );
          })()
        )}
      </div>
    </div>
  );
}

function DateDivider({ date }: { date: string }) {
  return (
    <div className="flex items-center justify-center my-4">
      <span className="text-xs text-gray-500 bg-brand-black px-3 py-1 rounded-full">
        {date}
      </span>
    </div>
  );
}

export function ChatView({ conversation }: { conversation: Conversation }) {
  const router = useRouter();
  const { user } = useAuth();
  const { messages, loading, sending, sendMessage, loadOlder, loadingOlder, hasOlder } =
    useChat(conversation.id);
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [showAddPeople, setShowAddPeople] = useState(false);

  // Display name
  const displayName =
    conversation.type === 'group'
      ? conversation.groupName || 'Group Chat'
      : Object.entries(conversation.participantNames)
          .filter(([uid]) => uid !== user?.uid)
          .map(([, name]) => name)
          .join(', ') || 'Unknown';

  const subtitle =
    conversation.type === 'group'
      ? `${conversation.participants.length} members`
      : undefined;

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, autoScroll]);

  // Detect if user has scrolled up
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setAutoScroll(isNearBottom);
  }, []);

  // Send handler
  const handleSend = async () => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setText('');
    setAutoScroll(true);
    await sendMessage(trimmed, conversation.participants);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  let currentDate = '';
  for (const msg of messages) {
    const msgDate = msg.timestamp?.toDate?.()
      ? msg.timestamp.toDate().toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : 'Unknown';
    if (msgDate !== currentDate) {
      currentDate = msgDate;
      groupedMessages.push({ date: msgDate, messages: [] });
    }
    groupedMessages[groupedMessages.length - 1].messages.push(msg);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-brand-black">
        <button
          onClick={() => router.push('/messages')}
          className="p-1 rounded-lg hover:bg-gray-800 transition-colors md:hidden"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          conversation.type === 'group' ? 'bg-brand-gold/20' : 'bg-gray-700'
        )}>
          {conversation.type === 'group' ? (
            <Users className="w-4 h-4 text-brand-gold" />
          ) : (
            <span className="text-sm font-medium text-gray-300">
              {displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-white truncate">{displayName}</h3>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <button
          onClick={() => setShowAddPeople(true)}
          className="p-2 rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
          title="Add people"
        >
          <UserPlus className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Add People Sheet */}
      {showAddPeople && (
        <AddPeopleSheet
          conversation={conversation}
          onClose={() => setShowAddPeople(false)}
        />
      )}

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-2"
      >
        {/* Load older */}
        {hasOlder && messages.length > 0 && (
          <div className="flex justify-center py-2">
            <button
              onClick={loadOlder}
              disabled={loadingOlder}
              className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1"
            >
              {loadingOlder ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <ChevronUp className="w-3 h-3" />
              )}
              Load older messages
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No messages yet. Say hi!
          </div>
        ) : (
          (() => {
            // Find the last message sent by current user (for read receipt)
            const lastMineId = [...messages].reverse().find((m) => m.senderId === user?.uid)?.id;

            return groupedMessages.map((group) => (
              <div key={group.date}>
                <DateDivider date={group.date} />
                {group.messages.map((msg, i) => {
                  const prevMsg = i > 0 ? group.messages[i - 1] : null;
                  const showSender =
                    conversation.type === 'group' &&
                    (!prevMsg || prevMsg.senderId !== msg.senderId);

                  return (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isMine={msg.senderId === user?.uid}
                      showSender={showSender}
                      conversationId={conversation.id}
                      userId={user?.uid || ''}
                      participants={conversation.participants}
                      isLastMine={msg.id === lastMineId}
                    />
                  );
                })}
              </div>
            ));
          })()
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-gray-800 bg-brand-black safe-area-bottom">
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-gray-800 text-white rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder-gray-500 max-h-32"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0',
              text.trim()
                ? 'bg-brand-gold text-brand-black hover:bg-brand-gold-light active:scale-95 shadow-md shadow-brand-gold/20'
                : 'bg-gray-700 text-gray-400'
            )}
          >
            {sending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

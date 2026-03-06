'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import type { Conversation, Message } from '@/types/message';
import {
  subscribeToConversations,
  subscribeToMessages,
  sendMessage as sendMessageFn,
  markConversationRead,
  createConversation,
  loadOlderMessages,
  subscribeToUnreadCount,
} from '@/lib/firebase/messages';
import type { Timestamp } from 'firebase/firestore';

// ---------- Conversations list ----------

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToConversations(user.uid, (data) => {
      setConversations(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [user?.uid]);

  return { conversations, loading };
}

// ---------- Single conversation messages ----------

export function useChat(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlder, setHasOlder] = useState(true);

  // Subscribe to messages
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToMessages(conversationId, (data) => {
      setMessages(data);
      setLoading(false);
    });

    return unsubscribe;
  }, [conversationId]);

  // Mark as read when viewing
  useEffect(() => {
    if (!conversationId || !user?.uid) return;
    markConversationRead(conversationId, user.uid);
  }, [conversationId, user?.uid, messages.length]);

  // Send message
  const sendMessage = useCallback(
    async (text: string, participants: string[]) => {
      if (!conversationId || !user?.uid || !user?.displayName) return;
      setSending(true);
      try {
        await sendMessageFn(conversationId, user.uid, user.displayName, text, participants);
      } finally {
        setSending(false);
      }
    },
    [conversationId, user?.uid, user?.displayName]
  );

  // Load older messages
  const loadOlder = useCallback(async () => {
    if (!conversationId || messages.length === 0 || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    try {
      const oldest = messages[0];
      const olderMessages = await loadOlderMessages(
        conversationId,
        oldest.timestamp as Timestamp
      );
      if (olderMessages.length === 0) {
        setHasOlder(false);
      } else {
        setMessages((prev) => [...olderMessages, ...prev]);
      }
    } finally {
      setLoadingOlder(false);
    }
  }, [conversationId, messages, loadingOlder, hasOlder]);

  return { messages, loading, sending, sendMessage, loadOlder, loadingOlder, hasOlder };
}

// ---------- Create conversation ----------

export function useCreateConversation() {
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);

  const create = useCallback(
    async (
      type: '1:1' | 'group',
      participants: string[],
      participantNames: Record<string, string>,
      groupName?: string
    ): Promise<string | null> => {
      if (!user?.uid) return null;
      setCreating(true);
      try {
        // Ensure current user is included
        const allParticipants = participants.includes(user.uid)
          ? participants
          : [user.uid, ...participants];
        const allNames = { ...participantNames, [user.uid]: user.displayName || 'Unknown' };

        return await createConversation(type, allParticipants, allNames, user.uid, groupName);
      } finally {
        setCreating(false);
      }
    },
    [user?.uid, user?.displayName]
  );

  return { create, creating };
}

// ---------- Unread count (for badges) ----------

export function useUnreadMessageCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.uid) {
      setCount(0);
      return;
    }

    return subscribeToUnreadCount(user.uid, setCount);
  }, [user?.uid]);

  return count;
}

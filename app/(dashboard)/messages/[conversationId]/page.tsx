'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { ConversationList } from '@/components/messages/ConversationList';
import { ChatView } from '@/components/messages/ChatView';
import type { Conversation } from '@/types/message';

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.conversationId as string;
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'conversations', conversationId),
      (docSnap) => {
        if (docSnap.exists()) {
          setConversation({ id: docSnap.id, ...docSnap.data() } as Conversation);
        } else {
          router.push('/messages');
        }
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [conversationId, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
      </div>
    );
  }

  if (!conversation) return null;

  return (
    <div className="flex h-[calc(100vh-4rem-4rem)] md:h-[calc(100vh-4rem)]">
      {/* Conversation list - hidden on mobile when viewing a chat */}
      <div className="hidden md:block w-80 border-r border-gray-800 flex-shrink-0">
        <ConversationList activeId={conversationId} />
      </div>

      {/* Chat view - full screen on mobile */}
      <div className="flex-1 min-w-0">
        <ChatView conversation={conversation} />
      </div>
    </div>
  );
}

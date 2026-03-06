'use client';

import { MessageSquare } from 'lucide-react';
import { ConversationList } from '@/components/messages/ConversationList';

export default function MessagesPage() {
  return (
    <div className="flex h-[calc(100vh-4rem-4rem)] md:h-[calc(100vh-4rem)]">
      {/* Conversation list - always visible on mobile, left panel on desktop */}
      <div className="w-full md:w-80 md:border-r md:border-gray-800 flex-shrink-0">
        <ConversationList />
      </div>

      {/* Empty state - desktop only */}
      <div className="hidden md:flex flex-1 items-center justify-center text-gray-500">
        <div className="text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Select a conversation or start a new one</p>
        </div>
      </div>
    </div>
  );
}

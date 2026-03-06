'use client';

import { NewConversation } from '@/components/messages/NewConversation';

export default function NewMessagePage() {
  return (
    <div className="h-[calc(100vh-4rem-4rem)] md:h-[calc(100vh-4rem)]">
      <NewConversation />
    </div>
  );
}

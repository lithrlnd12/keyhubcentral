'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { SubscriptionForm } from '@/components/subscriptions';
import { redirect } from 'next/navigation';

export default function NewSubscriberPage() {
  const { user, loading } = useAuth();

  if (!loading && user?.role && !['owner', 'admin'].includes(user.role)) {
    redirect('/kd/subscribers');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-gray-800/50 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-800/50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return <SubscriptionForm mode="create" />;
}

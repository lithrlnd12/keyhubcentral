'use client';

import { Subscription } from '@/types/lead';
import { SubscriberCard } from './SubscriberCard';
import { Spinner } from '@/components/ui/Spinner';
import { Building2, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface SubscriberListProps {
  subscriptions: Subscription[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  showAddButton?: boolean;
  className?: string;
}

export function SubscriberList({
  subscriptions,
  loading = false,
  error = null,
  emptyMessage = 'No subscribers found',
  showAddButton = true,
  className,
}: SubscriberListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <div className="text-center py-12">
        <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">{emptyMessage}</p>
        {showAddButton && (
          <Link
            href="/kd/subscribers/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-black rounded-lg font-medium hover:bg-brand-gold/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Subscriber
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {subscriptions.map((subscription) => (
        <SubscriberCard key={subscription.id} subscription={subscription} />
      ))}
    </div>
  );
}

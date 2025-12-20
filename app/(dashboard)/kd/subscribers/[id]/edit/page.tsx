'use client';

import { useParams } from 'next/navigation';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useAuth } from '@/lib/hooks/useAuth';
import { SubscriptionForm } from '@/components/subscriptions';
import { Spinner } from '@/components/ui/Spinner';
import { redirect } from 'next/navigation';

export default function EditSubscriberPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { subscription, loading, error } = useSubscription(id);

  if (!authLoading && user?.role && !['owner', 'admin'].includes(user.role)) {
    redirect(`/kd/subscribers/${id}`);
  }

  if (loading || authLoading) {
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

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Subscription not found</p>
      </div>
    );
  }

  return <SubscriptionForm subscription={subscription} mode="edit" />;
}

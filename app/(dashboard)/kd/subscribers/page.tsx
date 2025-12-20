'use client';

import { useSubscriptions } from '@/lib/hooks/useSubscriptions';
import { useAuth } from '@/lib/hooks/useAuth';
import { SubscriberList } from '@/components/subscriptions';
import { Button } from '@/components/ui/Button';
import { getSubscriptionSummary } from '@/lib/utils/subscriptions';
import { formatCurrency } from '@/lib/utils/formatters';
import { Plus, Building2, DollarSign, Star, Zap, Crown, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SubscribersPage() {
  const { user } = useAuth();
  const { subscriptions, loading, error } = useSubscriptions({ realtime: true });

  const summary = getSubscriptionSummary(subscriptions);
  const canCreate = user?.role && ['owner', 'admin'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/kd"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KD
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Subscribers</h1>
            <p className="text-gray-400 mt-1">Manage lead subscription customers</p>
          </div>
          {canCreate && (
            <Link href="/kd/subscribers/new">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Add Subscriber
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-brand-gold" />
            <div>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
              <p className="text-sm text-gray-400">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(summary.mrr)}
              </p>
              <p className="text-sm text-gray-400">MRR</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Star className="w-6 h-6 text-blue-400" />
            <div>
              <p className="text-xl font-bold text-blue-400">{summary.byTier.starter}</p>
              <p className="text-xs text-gray-400">Starter</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 text-purple-400" />
            <div>
              <p className="text-xl font-bold text-purple-400">{summary.byTier.growth}</p>
              <p className="text-xs text-gray-400">Growth</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-3">
            <Crown className="w-6 h-6 text-brand-gold" />
            <div>
              <p className="text-xl font-bold text-brand-gold">{summary.byTier.pro}</p>
              <p className="text-xs text-gray-400">Pro</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscriber List */}
      <SubscriberList
        subscriptions={subscriptions}
        loading={loading}
        error={error}
        showAddButton={canCreate}
        emptyMessage="No subscribers yet. Add your first subscriber to start selling leads."
      />
    </div>
  );
}

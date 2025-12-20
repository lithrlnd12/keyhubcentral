'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useLeads } from '@/lib/hooks/useLeads';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TierBadge, StatusBadge } from '@/components/subscriptions';
import { Spinner } from '@/components/ui/Spinner';
import { getSubscriptionByUser } from '@/lib/firebase/subscriptions';
import { getTierDetails, getLeadCapUsage } from '@/lib/utils/subscriptions';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  ArrowLeft,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Subscription } from '@/types/lead';
import { cn } from '@/lib/utils/cn';

export default function SubscriberSubscriptionPage() {
  const { user, loading: authLoading } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  const { leads } = useLeads({
    realtime: true,
    initialFilters: { assignedTo: user?.uid },
  });

  useEffect(() => {
    async function fetchSubscription() {
      if (user?.uid) {
        try {
          const sub = await getSubscriptionByUser(user.uid);
          setSubscription(sub);
        } catch (err) {
          console.error('Failed to fetch subscription:', err);
        } finally {
          setSubLoading(false);
        }
      }
    }
    fetchSubscription();
  }, [user?.uid]);

  if (authLoading || subLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <Link
          href="/subscriber"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="text-center py-12">
          <p className="text-gray-400">No subscription found. Please contact support.</p>
        </div>
      </div>
    );
  }

  const tierDetails = getTierDetails(subscription.tier);
  const leadUsage = getLeadCapUsage(subscription, leads.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/subscriber"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">My Subscription</h1>
          <StatusBadge status={subscription.status} />
        </div>
        <p className="text-gray-400 mt-1">View your subscription details and usage</p>
      </div>

      {/* Tier & Status */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <TierBadge tier={subscription.tier} size="lg" />
              <div>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(subscription.monthlyFee)}/month
                </p>
                <p className="text-sm text-gray-400">
                  {tierDetails.leadRange} leads included
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lead Usage */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-gold" />
            Lead Usage This Month
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">
                {leadUsage.used} of {leadUsage.cap} leads used
              </span>
              <span className={cn(
                'font-medium',
                leadUsage.percentage > 90 ? 'text-red-400' :
                leadUsage.percentage > 70 ? 'text-yellow-400' : 'text-green-400'
              )}>
                {leadUsage.remaining} remaining
              </span>
            </div>
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  leadUsage.percentage > 90 ? 'bg-red-500' :
                  leadUsage.percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                )}
                style={{ width: `${leadUsage.percentage}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Details */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Min Ad Spend</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(subscription.adSpendMin)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Calendar className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Next Billing</p>
                <p className="text-xl font-bold text-white">
                  {formatDate(subscription.billingCycle.toDate())}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Member Since */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Member Since</p>
              <p className="text-xl font-bold text-white">
                {formatDate(subscription.startDate.toDate())}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

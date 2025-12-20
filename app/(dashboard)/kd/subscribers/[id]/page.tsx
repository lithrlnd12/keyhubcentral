'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useSubscription } from '@/lib/hooks/useSubscription';
import { useAuth } from '@/lib/hooks/useAuth';
import { TierBadge, StatusBadge } from '@/components/subscriptions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { pauseSubscription, resumeSubscription, cancelSubscription } from '@/lib/firebase/subscriptions';
import { getTierDetails } from '@/lib/utils/subscriptions';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  ArrowLeft,
  Edit,
  User,
  DollarSign,
  Users,
  Calendar,
  Pause,
  Play,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function SubscriberDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { subscription, loading, error } = useSubscription(id);
  const [actionLoading, setActionLoading] = useState(false);

  const canEdit = user?.role && ['owner', 'admin'].includes(user.role);

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

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Subscription not found</p>
      </div>
    );
  }

  const tierDetails = getTierDetails(subscription.tier);

  const handlePause = async () => {
    setActionLoading(true);
    try {
      await pauseSubscription(subscription.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      await resumeSubscription(subscription.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;
    setActionLoading(true);
    try {
      await cancelSubscription(subscription.id);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/kd/subscribers"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Subscribers
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-500" />
              <h1 className="text-2xl font-bold text-white">{subscription.userId}</h1>
            </div>
            <div className="flex items-center gap-2">
              <TierBadge tier={subscription.tier} />
              <StatusBadge status={subscription.status} />
            </div>
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              {subscription.status === 'active' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePause}
                  disabled={actionLoading}
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              {subscription.status === 'paused' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResume}
                  disabled={actionLoading}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              {subscription.status !== 'cancelled' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={actionLoading}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
              <Link href={`/kd/subscribers/${subscription.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Monthly Fee</p>
                <p className="text-xl font-bold text-white">
                  {formatCurrency(subscription.monthlyFee)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Lead Cap</p>
                <p className="text-xl font-bold text-white">
                  {subscription.leadCap}/month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <DollarSign className="w-6 h-6 text-purple-400" />
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
      </div>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400">Start Date</p>
                <p className="text-white">
                  {formatDate(subscription.startDate.toDate())}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400">Next Billing</p>
                <p className="text-white">
                  {formatDate(subscription.billingCycle.toDate())}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tier Info */}
      <Card>
        <CardHeader>
          <CardTitle>Tier Benefits</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Lead Range</span>
              <span className="text-white">{tierDetails.leadRange} leads/month</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Base Monthly Fee</span>
              <span className="text-white">{formatCurrency(tierDetails.monthlyFee)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Minimum Ad Spend</span>
              <span className="text-white">{formatCurrency(tierDetails.adSpendMin)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

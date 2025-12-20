'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Subscription, SubscriptionTier, SUBSCRIPTION_TIERS } from '@/types/lead';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { createSubscription, updateSubscription } from '@/lib/firebase/subscriptions';
import { SUBSCRIPTION_TIER_LABELS } from '@/lib/utils/subscriptions';
import { formatCurrency } from '@/lib/utils/formatters';
import { Building2, Save, ArrowLeft, Star, Zap, Crown } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface SubscriptionFormProps {
  subscription?: Subscription;
  mode: 'create' | 'edit';
}

const TIER_OPTIONS: SubscriptionTier[] = ['starter', 'growth', 'pro'];

const TIER_ICONS = {
  starter: Star,
  growth: Zap,
  pro: Crown,
};

export function SubscriptionForm({ subscription, mode }: SubscriptionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    userId: subscription?.userId || '',
    tier: subscription?.tier || ('starter' as SubscriptionTier),
    monthlyFee: subscription?.monthlyFee?.toString() || SUBSCRIPTION_TIERS.starter.monthlyFee.toString(),
    adSpendMin: subscription?.adSpendMin?.toString() || SUBSCRIPTION_TIERS.starter.adSpendMin.toString(),
    leadCap: subscription?.leadCap?.toString() || '15',
  });

  const handleTierChange = (tier: SubscriptionTier) => {
    const tierDetails = SUBSCRIPTION_TIERS[tier];
    setFormData((prev) => ({
      ...prev,
      tier,
      monthlyFee: tierDetails.monthlyFee.toString(),
      adSpendMin: tierDetails.adSpendMin.toString(),
      leadCap: tier === 'starter' ? '15' : tier === 'growth' ? '25' : '50',
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.userId.trim()) {
      setError('User ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const subscriptionData = {
        userId: formData.userId,
        tier: formData.tier,
        monthlyFee: parseFloat(formData.monthlyFee) || 0,
        adSpendMin: parseFloat(formData.adSpendMin) || 0,
        leadCap: parseInt(formData.leadCap) || 15,
        status: 'active' as const,
        startDate: subscription?.startDate || Timestamp.now(),
        billingCycle: subscription?.billingCycle || Timestamp.now(),
      };

      if (mode === 'create') {
        const id = await createSubscription(subscriptionData);
        router.push(`/kd/subscribers/${id}`);
      } else if (subscription) {
        await updateSubscription(subscription.id, subscriptionData);
        router.push(`/kd/subscribers/${subscription.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save subscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={mode === 'edit' && subscription ? `/kd/subscribers/${subscription.id}` : '/kd/subscribers'}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {mode === 'create' ? 'Add Subscriber' : 'Edit Subscription'}
          </h1>
        </div>
        <Button type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* User Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-brand-gold" />
              Subscriber Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                User ID <span className="text-red-400">*</span>
              </label>
              <Input
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                placeholder="Firebase user ID"
                required
                disabled={mode === 'edit'}
              />
              <p className="text-xs text-gray-500 mt-1">
                The Firebase UID of the subscriber user
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Tier Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {TIER_OPTIONS.map((tier) => {
                const Icon = TIER_ICONS[tier];
                const details = SUBSCRIPTION_TIERS[tier];
                const isSelected = formData.tier === tier;

                return (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => handleTierChange(tier)}
                    className={cn(
                      'flex items-center justify-between p-4 rounded-lg border transition-colors text-left',
                      isSelected
                        ? 'bg-brand-gold/20 border-brand-gold'
                        : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn(
                        'w-5 h-5',
                        isSelected ? 'text-brand-gold' : 'text-gray-400'
                      )} />
                      <div>
                        <p className={cn(
                          'font-medium',
                          isSelected ? 'text-white' : 'text-gray-300'
                        )}>
                          {SUBSCRIPTION_TIER_LABELS[tier]}
                        </p>
                        <p className="text-sm text-gray-500">
                          {details.leadRange} leads/mo
                        </p>
                      </div>
                    </div>
                    <p className={cn(
                      'font-bold',
                      isSelected ? 'text-brand-gold' : 'text-gray-400'
                    )}>
                      {formatCurrency(details.monthlyFee)}/mo
                    </p>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pricing Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Monthly Fee
                </label>
                <Input
                  name="monthlyFee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.monthlyFee}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Minimum Ad Spend
                </label>
                <Input
                  name="adSpendMin"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.adSpendMin}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Lead Cap
                </label>
                <Input
                  name="leadCap"
                  type="number"
                  min="1"
                  value={formData.leadCap}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

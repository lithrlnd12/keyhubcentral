'use client';

import { Subscription } from '@/types/lead';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { getSubscriptionSummary, SUBSCRIPTION_TIER_COLORS, SUBSCRIPTION_TIER_LABELS } from '@/lib/utils/subscriptions';
import { formatCurrency } from '@/lib/utils/formatters';
import { Star, Zap, Crown } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SubscriberBreakdownProps {
  subscriptions: Subscription[];
  className?: string;
}

const TIER_ICONS = {
  starter: Star,
  growth: Zap,
  pro: Crown,
};

export function SubscriberBreakdown({ subscriptions, className }: SubscriberBreakdownProps) {
  const summary = getSubscriptionSummary(subscriptions);

  if (subscriptions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Subscribers by Tier</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-4">No subscribers yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Subscribers by Tier</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(['pro', 'growth', 'starter'] as const).map((tier) => {
            const count = summary.byTier[tier];
            const colors = SUBSCRIPTION_TIER_COLORS[tier];
            const Icon = TIER_ICONS[tier];
            const percentage = summary.total > 0 ? (count / summary.total) * 100 : 0;

            return (
              <div key={tier}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className={cn('w-4 h-4', colors.text)} />
                    <span className="text-gray-300">{SUBSCRIPTION_TIER_LABELS[tier]}</span>
                  </div>
                  <span className={colors.text}>
                    {count} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', colors.bg.replace('/20', ''))}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Total MRR</span>
            <span className="text-xl font-bold text-brand-gold">
              {formatCurrency(summary.mrr)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Subscription, SubscriptionTier, SubscriptionStatus, SUBSCRIPTION_TIERS } from '@/types/lead';

// Tier display labels
export const SUBSCRIPTION_TIER_LABELS: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  growth: 'Growth',
  pro: 'Pro',
};

// Tier colors
export const SUBSCRIPTION_TIER_COLORS: Record<SubscriptionTier, { bg: string; text: string; border: string }> = {
  starter: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  growth: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  pro: { bg: 'bg-brand-gold/20', text: 'text-brand-gold', border: 'border-brand-gold/30' },
};

// Status labels
export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  cancelled: 'Cancelled',
};

// Status colors
export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, { bg: string; text: string; border: string }> = {
  active: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  paused: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  cancelled: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

// Format tier for display
export function formatSubscriptionTier(tier: SubscriptionTier): string {
  return SUBSCRIPTION_TIER_LABELS[tier] || tier;
}

// Format status for display
export function formatSubscriptionStatus(status: SubscriptionStatus): string {
  return SUBSCRIPTION_STATUS_LABELS[status] || status;
}

// Get tier details
export function getTierDetails(tier: SubscriptionTier) {
  return SUBSCRIPTION_TIERS[tier];
}

// Get subscription summary stats
export function getSubscriptionSummary(subscriptions: Subscription[]): {
  total: number;
  active: number;
  paused: number;
  cancelled: number;
  mrr: number;
  byTier: Record<SubscriptionTier, number>;
} {
  let active = 0;
  let paused = 0;
  let cancelled = 0;
  let mrr = 0;
  const byTier: Record<SubscriptionTier, number> = {
    starter: 0,
    growth: 0,
    pro: 0,
  };

  subscriptions.forEach((sub) => {
    if (sub.status === 'active') {
      active++;
      mrr += sub.monthlyFee;
    }
    if (sub.status === 'paused') paused++;
    if (sub.status === 'cancelled') cancelled++;
    byTier[sub.tier]++;
  });

  return {
    total: subscriptions.length,
    active,
    paused,
    cancelled,
    mrr,
    byTier,
  };
}

// Calculate lead cap usage
export function getLeadCapUsage(subscription: Subscription, leadsUsed: number): {
  used: number;
  cap: number;
  percentage: number;
  remaining: number;
} {
  const percentage = subscription.leadCap > 0 ? (leadsUsed / subscription.leadCap) * 100 : 0;
  return {
    used: leadsUsed,
    cap: subscription.leadCap,
    percentage: Math.min(percentage, 100),
    remaining: Math.max(subscription.leadCap - leadsUsed, 0),
  };
}

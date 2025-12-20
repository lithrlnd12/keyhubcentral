'use client';

import { SubscriptionTier } from '@/types/lead';
import { SUBSCRIPTION_TIER_LABELS, SUBSCRIPTION_TIER_COLORS } from '@/lib/utils/subscriptions';
import { cn } from '@/lib/utils/cn';
import { Star, Zap, Crown } from 'lucide-react';

interface TierBadgeProps {
  tier: SubscriptionTier;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const TIER_ICONS = {
  starter: Star,
  growth: Zap,
  pro: Crown,
};

export function TierBadge({
  tier,
  size = 'md',
  showIcon = true,
  className,
}: TierBadgeProps) {
  const colors = SUBSCRIPTION_TIER_COLORS[tier];
  const label = SUBSCRIPTION_TIER_LABELS[tier];
  const Icon = TIER_ICONS[tier];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  );
}

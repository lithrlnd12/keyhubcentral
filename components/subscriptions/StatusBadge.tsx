'use client';

import { SubscriptionStatus } from '@/types/lead';
import { SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS } from '@/lib/utils/subscriptions';
import { cn } from '@/lib/utils/cn';

interface StatusBadgeProps {
  status: SubscriptionStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  size = 'md',
  showDot = false,
  className,
}: StatusBadgeProps) {
  const colors = SUBSCRIPTION_STATUS_COLORS[status];
  const label = SUBSCRIPTION_STATUS_LABELS[status];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        className
      )}
    >
      {showDot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', colors.text.replace('text-', 'bg-'))} />
      )}
      {label}
    </span>
  );
}

'use client';

import { LeadStatus } from '@/types/lead';
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/utils/leads';
import { cn } from '@/lib/utils/cn';

interface LeadStatusBadgeProps {
  status: LeadStatus;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
  className?: string;
}

export function LeadStatusBadge({
  status,
  size = 'md',
  showDot = false,
  className,
}: LeadStatusBadgeProps) {
  const colors = LEAD_STATUS_COLORS[status];
  const label = LEAD_STATUS_LABELS[status];

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

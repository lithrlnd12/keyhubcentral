'use client';

import { LeadSource } from '@/types/lead';
import { LEAD_SOURCE_LABELS, LEAD_SOURCE_COLORS } from '@/lib/utils/leads';
import { cn } from '@/lib/utils/cn';

interface LeadSourceBadgeProps {
  source: LeadSource;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LeadSourceBadge({
  source,
  size = 'md',
  className,
}: LeadSourceBadgeProps) {
  const colors = LEAD_SOURCE_COLORS[source];
  const label = LEAD_SOURCE_LABELS[source];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md font-medium',
        colors.bg,
        colors.text,
        sizeClasses[size],
        className
      )}
    >
      {label}
    </span>
  );
}

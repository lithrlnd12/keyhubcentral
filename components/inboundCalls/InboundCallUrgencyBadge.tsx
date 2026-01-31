'use client';

import { cn } from '@/lib/utils';
import { Urgency } from '@/types/inboundCall';
import { URGENCY_CONFIG } from '@/lib/utils/inboundCalls';

interface InboundCallUrgencyBadgeProps {
  urgency: Urgency | null;
  className?: string;
}

export function InboundCallUrgencyBadge({ urgency, className }: InboundCallUrgencyBadgeProps) {
  if (!urgency) {
    return (
      <span
        className={cn(
          'px-2 py-0.5 rounded-full text-xs font-medium border',
          'text-gray-400 bg-gray-400/10 border-gray-400/30',
          className
        )}
      >
        Unknown
      </span>
    );
  }

  const config = URGENCY_CONFIG[urgency];

  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-xs font-medium border',
        config.color,
        config.bgColor,
        className
      )}
    >
      {config.label}
    </span>
  );
}

'use client';

import { cn } from '@/lib/utils';
import { InboundCallStatus } from '@/types/inboundCall';
import { INBOUND_CALL_STATUS_CONFIG } from '@/lib/utils/inboundCalls';

interface InboundCallStatusBadgeProps {
  status: InboundCallStatus;
  className?: string;
}

export function InboundCallStatusBadge({ status, className }: InboundCallStatusBadgeProps) {
  const config = INBOUND_CALL_STATUS_CONFIG[status];

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

'use client';

import { cn } from '@/lib/utils';
import { InvoiceStatus } from '@/types/invoice';
import { INVOICE_STATUS_CONFIG } from '@/lib/utils/invoices';

interface InvoiceStatusBadgeProps {
  status: InvoiceStatus;
  size?: 'sm' | 'md';
  className?: string;
}

export function InvoiceStatusBadge({
  status,
  size = 'md',
  className,
}: InvoiceStatusBadgeProps) {
  const config = INVOICE_STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium capitalize',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        className
      )}
    >
      {config.label}
    </span>
  );
}

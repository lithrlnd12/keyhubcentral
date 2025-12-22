'use client';

import Link from 'next/link';
import { Invoice } from '@/types/invoice';
import { Card, CardContent } from '@/components/ui/Card';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import {
  formatEntityName,
  formatInvoiceDate,
  formatDueDateWithStatus,
  getInvoiceType,
  isOverdue,
  ENTITY_CONFIG,
} from '@/lib/utils/invoices';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface InvoiceCardProps {
  invoice: Invoice;
  showDetails?: boolean;
  className?: string;
}

export function InvoiceCard({
  invoice,
  showDetails = true,
  className,
}: InvoiceCardProps) {
  const overdue = isOverdue(invoice);
  const dueStatus = formatDueDateWithStatus(invoice);

  return (
    <Link href={`/financials/invoices/${invoice.id}`}>
      <Card
        className={cn(
          'hover:border-brand-gold/50 transition-colors cursor-pointer',
          overdue && 'border-red-500/30',
          className
        )}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">
                  {invoice.invoiceNumber}
                </span>
                {overdue && (
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
              </div>
              <span className="text-gray-400 text-sm">{getInvoiceType(invoice)}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <InvoiceStatusBadge
                status={overdue ? 'overdue' : invoice.status}
                size="sm"
              />
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* From -> To */}
          <div className="flex items-center gap-2 mb-3">
            <span className={cn('text-sm font-medium', ENTITY_CONFIG[invoice.from?.entity]?.color || 'text-gray-400')}>
              {ENTITY_CONFIG[invoice.from?.entity]?.shortLabel || 'Unknown'}
            </span>
            <ArrowRight className="w-4 h-4 text-gray-600" />
            <span className={cn('text-sm', ENTITY_CONFIG[invoice.to?.entity]?.color || 'text-gray-400')}>
              {formatEntityName(invoice.to) || 'Unknown'}
            </span>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-white">
              {formatCurrency(invoice.total)}
            </span>

            {showDetails && (
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className={dueStatus.color}>{dueStatus.text}</span>
              </div>
            )}
          </div>

          {/* Line items preview */}
          {showDetails && invoice.lineItems.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700/50">
              <div className="text-sm text-gray-400">
                {invoice.lineItems.length} line item
                {invoice.lineItems.length !== 1 ? 's' : ''}
                {invoice.lineItems.length > 0 && (
                  <span className="text-gray-500">
                    {' '}
                    - {invoice.lineItems[0].description.slice(0, 40)}
                    {invoice.lineItems[0].description.length > 40 ? '...' : ''}
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

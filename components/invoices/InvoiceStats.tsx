'use client';

import { Invoice } from '@/types/invoice';
import { formatCurrency } from '@/lib/utils/formatters';
import { isOverdue, groupInvoicesByStatus } from '@/lib/utils/invoices';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { FileText, Send, CheckCircle, AlertTriangle, DollarSign } from 'lucide-react';

interface InvoiceStatsProps {
  invoices: Invoice[];
  className?: string;
}

export function InvoiceStats({ invoices, className }: InvoiceStatsProps) {
  const stats = useMemo(() => {
    const grouped = groupInvoicesByStatus(invoices);

    const amountOutstanding = invoices
      .filter((inv) => inv.status !== 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    const amountOverdue = invoices
      .filter((inv) => inv.status !== 'paid' && isOverdue(inv))
      .reduce((sum, inv) => sum + inv.total, 0);

    const amountPaid = invoices
      .filter((inv) => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);

    return {
      draft: grouped.draft.length,
      sent: grouped.sent.length,
      paid: grouped.paid.length,
      overdue: grouped.overdue.length,
      amountOutstanding,
      amountOverdue,
      amountPaid,
    };
  }, [invoices]);

  const statCards = [
    {
      label: 'Draft',
      value: stats.draft,
      icon: FileText,
      color: 'text-gray-400',
      bgColor: 'bg-gray-500/10',
    },
    {
      label: 'Sent',
      value: stats.sent,
      icon: Send,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Paid',
      value: stats.paid,
      icon: CheckCircle,
      color: 'text-green-400',
      bgColor: 'bg-green-500/10',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      icon: AlertTriangle,
      color: 'text-red-400',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status counts */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="bg-brand-charcoal rounded-xl border border-gray-800 p-4"
            >
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', stat.bgColor)}>
                  <Icon className={cn('w-5 h-5', stat.color)} />
                </div>
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Amount summaries */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <DollarSign className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Outstanding</p>
              <p className="text-xl font-bold text-yellow-400">
                {formatCurrency(stats.amountOutstanding)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Overdue Amount</p>
              <p className="text-xl font-bold text-red-400">
                {formatCurrency(stats.amountOverdue)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <DollarSign className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Collected</p>
              <p className="text-xl font-bold text-green-400">
                {formatCurrency(stats.amountPaid)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

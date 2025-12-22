'use client';

import { Invoice } from '@/types/invoice';
import { InvoiceCard } from './InvoiceCard';
import { Spinner } from '@/components/ui/Spinner';
import { FileText } from 'lucide-react';

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  emptyMessage?: string;
}

export function InvoiceList({
  invoices,
  loading,
  error,
  emptyMessage = 'No invoices found',
}: InvoiceListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-12 text-center">
        <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} />
      ))}
    </div>
  );
}

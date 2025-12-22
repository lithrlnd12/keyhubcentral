'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useInvoice } from '@/lib/hooks/useInvoice';
import { InvoiceForm } from '@/components/invoices';
import { Spinner } from '@/components/ui/Spinner';

export default function EditInvoicePage() {
  const params = useParams();
  const id = params.id as string;

  const { invoice, loading, error } = useInvoice(id);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <Link
          href="/financials"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Financials
        </Link>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-400">{error || 'Invoice not found'}</p>
        </div>
      </div>
    );
  }

  // Only allow editing draft invoices
  if (invoice.status !== 'draft') {
    return (
      <div className="space-y-6">
        <Link
          href={`/financials/invoices/${id}`}
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoice
        </Link>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
          <p className="text-yellow-400">
            Only draft invoices can be edited. This invoice has already been sent.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href={`/financials/invoices/${id}`}
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoice
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Edit Invoice</h1>
        <p className="text-gray-400 mt-1">{invoice.invoiceNumber}</p>
      </div>

      {/* Form */}
      <InvoiceForm invoice={invoice} mode="edit" />
    </div>
  );
}

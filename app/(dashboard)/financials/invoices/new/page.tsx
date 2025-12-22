'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { InvoiceForm } from '@/components/invoices';

export default function NewInvoicePage() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/financials"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Financials
      </Link>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Create Invoice</h1>
        <p className="text-gray-400 mt-1">Create a new invoice for billing</p>
      </div>

      {/* Form */}
      <InvoiceForm mode="create" />
    </div>
  );
}

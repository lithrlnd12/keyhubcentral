'use client';

import Link from 'next/link';
import { ArrowLeft, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InvoiceFilters, InvoiceList, InvoiceStats } from '@/components/invoices';
import { useInvoices } from '@/lib/hooks/useInvoices';
import { useAuth } from '@/lib/hooks/useAuth';
import { canViewFinancials } from '@/types/user';

export default function InvoicesListPage() {
  const { user } = useAuth();
  const {
    invoices,
    loading,
    error,
    filters,
    setStatus,
    setFromEntity,
    setSearch,
    setOverdue,
    setFilters,
  } = useInvoices({ realtime: true });

  const canManage = user?.role && canViewFinancials(user.role);

  const handleClearFilters = () => {
    setFilters({});
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">All Invoices</h1>
          <p className="text-gray-400 mt-1">View and manage all invoices</p>
        </div>

        {canManage && (
          <Link href="/financials/invoices/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </Link>
        )}
      </div>

      {/* Stats */}
      <InvoiceStats invoices={invoices} />

      {/* Filters */}
      <InvoiceFilters
        filters={filters}
        onStatusChange={setStatus}
        onFromEntityChange={setFromEntity}
        onSearchChange={setSearch}
        onOverdueChange={setOverdue}
        onClear={handleClearFilters}
      />

      {/* Results count */}
      <div className="text-sm text-gray-400">
        {!loading && (
          <span>
            {invoices.length} invoice{invoices.length !== 1 ? 's' : ''}
            {filters.status || filters.fromEntity || filters.search || filters.overdue
              ? ' (filtered)'
              : ''}
          </span>
        )}
      </div>

      {/* Invoice List */}
      <InvoiceList
        invoices={invoices}
        loading={loading}
        error={error}
      />
    </div>
  );
}

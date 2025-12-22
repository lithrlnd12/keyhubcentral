'use client';

import Link from 'next/link';
import { Plus, FileText, TrendingUp, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InvoiceFilters, InvoiceList, InvoiceStats } from '@/components/invoices';
import { useInvoices } from '@/lib/hooks/useInvoices';
import { useAuth } from '@/lib/hooks/useAuth';
import { canViewFinancials } from '@/types/user';

export default function FinancialsPage() {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Financials</h2>
          <p className="text-gray-400 mt-1">
            Invoices, payments, and P&L tracking
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/financials/pnl">
            <Button variant="secondary">
              <TrendingUp className="w-4 h-4 mr-2" />
              P&L Report
            </Button>
          </Link>
          {canManage && (
            <Link href="/financials/invoices/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/financials/invoices">
          <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4 hover:border-brand-gold/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">All Invoices</p>
                <p className="text-gray-400 text-sm">View and manage invoices</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/financials/pnl">
          <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4 hover:border-brand-gold/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">P&L Reports</p>
                <p className="text-gray-400 text-sm">Profit & loss by entity</p>
              </div>
            </div>
          </div>
        </Link>

        <Link href="/financials/earnings">
          <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4 hover:border-brand-gold/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Wallet className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-white font-medium">Contractor Earnings</p>
                <p className="text-gray-400 text-sm">Payments and commissions</p>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Invoice Stats */}
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
        emptyMessage="No invoices yet. Create your first invoice to get started."
      />
    </div>
  );
}

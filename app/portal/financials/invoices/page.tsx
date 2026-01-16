'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, FileText, Search, Filter } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth, useContractorInvoices } from '@/lib/hooks';
import { formatCurrency } from '@/lib/utils/formatters';
import { Invoice, InvoiceStatus } from '@/types/invoice';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
];

export default function PortalInvoicesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const {
    invoices,
    loading,
    stats,
    statusFilter,
    setStatusFilter,
  } = useContractorInvoices({
    contractorId: user?.uid || '',
    realtime: true,
  });

  // Client-side search filter
  const filteredInvoices = search
    ? invoices.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
          inv.to.name?.toLowerCase().includes(search.toLowerCase())
      )
    : invoices;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/portal/financials">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">My Invoices</h1>
          <p className="text-gray-400 mt-1">
            {stats.totalInvoices} total invoices
          </p>
        </div>
        <Link href="/portal/financials/invoices/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalRevenue)}</p>
          <p className="text-sm text-gray-500">Total Paid</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-400">{formatCurrency(stats.pendingRevenue)}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{stats.totalInvoices}</p>
          <p className="text-sm text-gray-500">Total Invoices</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search invoices..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter || ''}
            onChange={(e) =>
              setStatusFilter(e.target.value ? (e.target.value as InvoiceStatus) : undefined)
            }
            options={STATUS_OPTIONS}
            className="w-full sm:w-40"
          />
        </div>
      </Card>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">
            {search || statusFilter ? 'No invoices match your filters' : 'No invoices yet'}
          </p>
          {!search && !statusFilter && (
            <Link href="/portal/financials/invoices/new">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Invoice
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredInvoices.map((invoice: Invoice) => (
            <Link key={invoice.id} href={`/portal/financials/invoices/${invoice.id}`}>
              <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <FileText className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-400">To: {invoice.to.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <p className="text-white font-bold">{formatCurrency(invoice.total)}</p>
                      <p className="text-xs text-gray-500">
                        Due: {formatDate(invoice.dueDate)}
                      </p>
                    </div>
                    <Badge
                      variant={
                        invoice.status === 'paid'
                          ? 'success'
                          : invoice.status === 'sent'
                          ? 'warning'
                          : 'default'
                      }
                    >
                      {invoice.status}
                    </Badge>
                  </div>
                </div>

                {/* Line items preview */}
                {invoice.lineItems && invoice.lineItems.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-700">
                    <p className="text-xs text-gray-500">
                      {invoice.lineItems.length} item{invoice.lineItems.length > 1 ? 's' : ''}:{' '}
                      {invoice.lineItems
                        .slice(0, 2)
                        .map((item) => item.description)
                        .join(', ')}
                      {invoice.lineItems.length > 2 && '...'}
                    </p>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

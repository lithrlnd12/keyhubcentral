'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  Plus,
  Receipt,
  PieChart,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAuth, useContractorInvoices, useContractorExpenses } from '@/lib/hooks';
import { getContractorByUserId } from '@/lib/firebase/contractors';
import { Contractor } from '@/types/contractor';
import { formatCurrency } from '@/lib/utils/formatters';
import { Invoice } from '@/types/invoice';

export default function PortalFinancialsPage() {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  const { invoices, stats: invoiceStats, loading: invoicesLoading } = useContractorInvoices({
    contractorId: user?.uid || '',
    realtime: true,
  });

  const { stats: expenseStats, loading: expensesLoading } = useContractorExpenses({
    contractorId: user?.uid || '',
    realtime: true,
  });

  useEffect(() => {
    async function loadContractor() {
      if (user?.uid) {
        try {
          const data = await getContractorByUserId(user.uid);
          setContractor(data);
        } catch (error) {
          console.error('Error loading contractor:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadContractor();
  }, [user?.uid]);

  const netProfit = invoiceStats.totalRevenue - expenseStats.totalExpenses;
  const isLoading = loading || invoicesLoading || expensesLoading;

  // Get recent invoices (last 5)
  const recentInvoices = invoices.slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Financials</h1>
          <p className="text-gray-400 mt-1">
            Manage your invoices, expenses, and track your earnings
          </p>
        </div>
        <Link href="/portal/financials/invoices/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
            <span className="text-sm text-gray-400">Total Revenue</span>
          </div>
          <p className="text-2xl font-bold text-green-400">
            {formatCurrency(invoiceStats.totalRevenue)}
          </p>
          <p className="text-xs text-gray-500">From paid invoices</p>
        </Card>

        {/* Pending Revenue */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <DollarSign className="h-5 w-5 text-yellow-400" />
            </div>
            <span className="text-sm text-gray-400">Pending</span>
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            {formatCurrency(invoiceStats.pendingRevenue)}
          </p>
          <p className="text-xs text-gray-500">{invoiceStats.sentCount} invoices outstanding</p>
        </Card>

        {/* Total Expenses */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="h-5 w-5 text-red-400" />
            </div>
            <span className="text-sm text-gray-400">Expenses</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {formatCurrency(expenseStats.totalExpenses)}
          </p>
          <p className="text-xs text-gray-500">{expenseStats.expenseCount} transactions</p>
        </Card>

        {/* Net Profit */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gold/10 rounded-lg">
              <PieChart className="h-5 w-5 text-gold" />
            </div>
            <span className="text-sm text-gray-400">Net Profit</span>
          </div>
          <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(netProfit)}
          </p>
          <p className="text-xs text-gray-500">Revenue - Expenses</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/portal/financials/invoices">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">My Invoices</p>
                <p className="text-sm text-gray-400">{invoiceStats.totalInvoices} total</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500" />
            </div>
          </Card>
        </Link>

        <Link href="/portal/financials/expenses">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-500/10 rounded-lg">
                <Receipt className="h-6 w-6 text-red-400" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Expenses</p>
                <p className="text-sm text-gray-400">{expenseStats.expenseCount} transactions</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500" />
            </div>
          </Card>
        </Link>

        <Link href="/portal/financials/pnl">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gold/10 rounded-lg">
                <PieChart className="h-6 w-6 text-gold" />
              </div>
              <div className="flex-1">
                <p className="text-white font-medium">Profit & Loss</p>
                <p className="text-sm text-gray-400">View full report</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-500" />
            </div>
          </Card>
        </Link>
      </div>

      {/* Recent Invoices */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Recent Invoices</h2>
          <Link href="/portal/financials/invoices" className="text-gold text-sm hover:underline">
            View All
          </Link>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No invoices yet</p>
            <Link href="/portal/financials/invoices/new">
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Invoice
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentInvoices.map((invoice: Invoice) => (
              <Link key={invoice.id} href={`/portal/financials/invoices/${invoice.id}`}>
                <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-white font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-sm text-gray-400">{invoice.to.name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-medium">{formatCurrency(invoice.total)}</p>
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
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Invoice Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-gray-400">{invoiceStats.draftCount}</p>
          <p className="text-sm text-gray-500">Drafts</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{invoiceStats.sentCount}</p>
          <p className="text-sm text-gray-500">Pending</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{invoiceStats.paidCount}</p>
          <p className="text-sm text-gray-500">Paid</p>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { useAuth, useContractorInvoices, useContractorExpenses } from '@/lib/hooks';
import { formatCurrency } from '@/lib/utils/formatters';
import { getExpenseCategoryLabel, ExpenseCategory } from '@/types/expense';

const PERIOD_OPTIONS = [
  { value: 'mtd', label: 'Month to Date' },
  { value: 'qtd', label: 'Quarter to Date' },
  { value: 'ytd', label: 'Year to Date' },
  { value: 'all', label: 'All Time' },
];

function getDateRange(period: string): { startDate?: Date; endDate?: Date } {
  const now = new Date();
  const endDate = now;

  switch (period) {
    case 'mtd':
      return {
        startDate: new Date(now.getFullYear(), now.getMonth(), 1),
        endDate,
      };
    case 'qtd':
      const quarter = Math.floor(now.getMonth() / 3);
      return {
        startDate: new Date(now.getFullYear(), quarter * 3, 1),
        endDate,
      };
    case 'ytd':
      return {
        startDate: new Date(now.getFullYear(), 0, 1),
        endDate,
      };
    case 'all':
    default:
      return {};
  }
}

export default function PortalPnLPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState('mtd');

  const dateRange = useMemo(() => getDateRange(period), [period]);

  const { invoices, loading: invoicesLoading } = useContractorInvoices({
    contractorId: user?.uid || '',
    realtime: true,
  });

  const { expenses, stats: expenseStats, loading: expensesLoading } = useContractorExpenses({
    contractorId: user?.uid || '',
    realtime: true,
    ...dateRange,
  });

  // Filter invoices by date range
  const filteredInvoices = useMemo(() => {
    if (!dateRange.startDate) return invoices;

    return invoices.filter((inv) => {
      if (inv.status !== 'paid' || !inv.paidAt) return false;
      // Handle both Firestore Timestamp and Date objects
      const paidDate = 'toDate' in inv.paidAt ? inv.paidAt.toDate() : new Date(inv.paidAt as unknown as string | number);
      return paidDate >= dateRange.startDate! && paidDate <= dateRange.endDate!;
    });
  }, [invoices, dateRange]);

  // Calculate revenue from paid invoices
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);

  // Expense stats are already filtered by useContractorExpenses
  const totalExpenses = expenseStats.totalExpenses;

  // Calculate net profit
  const netProfit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0;

  const isLoading = invoicesLoading || expensesLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/portal/financials">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Profit & Loss</h1>
            <p className="text-gray-400 mt-1">
              Your business financial summary
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={PERIOD_OPTIONS}
            className="w-48"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
            <span className="text-gray-400">Revenue</span>
          </div>
          <p className="text-3xl font-bold text-green-400">{formatCurrency(totalRevenue)}</p>
          <p className="text-sm text-gray-500 mt-1">
            From {filteredInvoices.length} paid invoice{filteredInvoices.length !== 1 ? 's' : ''}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <TrendingDown className="h-6 w-6 text-red-400" />
            </div>
            <span className="text-gray-400">Expenses</span>
          </div>
          <p className="text-3xl font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
          <p className="text-sm text-gray-500 mt-1">
            {expenseStats.expenseCount} transaction{expenseStats.expenseCount !== 1 ? 's' : ''}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <DollarSign className="h-6 w-6 text-gold" />
            </div>
            <span className="text-gray-400">Net Profit</span>
          </div>
          <p className={`text-3xl font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(netProfit)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {profitMargin}% margin
          </p>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-white mb-6">Profit & Loss Statement</h2>

        {/* Revenue Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <span className="text-white font-semibold">Revenue</span>
            <span className="text-green-400 font-bold">{formatCurrency(totalRevenue)}</span>
          </div>

          {filteredInvoices.length > 0 ? (
            <div className="ml-4 mt-2 space-y-2">
              {filteredInvoices.slice(0, 5).map((inv) => (
                <div key={inv.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-gray-400">
                    {inv.invoiceNumber} - {inv.to.name}
                  </span>
                  <span className="text-gray-300">{formatCurrency(inv.total)}</span>
                </div>
              ))}
              {filteredInvoices.length > 5 && (
                <p className="text-gray-500 text-sm">
                  ... and {filteredInvoices.length - 5} more invoices
                </p>
              )}
            </div>
          ) : (
            <p className="ml-4 mt-2 text-gray-500 text-sm">No paid invoices in this period</p>
          )}
        </div>

        {/* Expenses Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between py-3 border-b border-gray-800">
            <span className="text-white font-semibold">Expenses</span>
            <span className="text-red-400 font-bold">({formatCurrency(totalExpenses)})</span>
          </div>

          {Object.keys(expenseStats.expensesByCategory).length > 0 ? (
            <div className="ml-4 mt-2 space-y-2">
              {Object.entries(expenseStats.expensesByCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([category, amount]) => (
                  <div key={category} className="flex items-center justify-between py-1 text-sm">
                    <span className="text-gray-400">
                      {getExpenseCategoryLabel(category as ExpenseCategory)}
                    </span>
                    <span className="text-gray-300">({formatCurrency(amount)})</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="ml-4 mt-2 text-gray-500 text-sm">No expenses in this period</p>
          )}
        </div>

        {/* Net Profit */}
        <div className="pt-4 border-t-2 border-gray-700">
          <div className="flex items-center justify-between py-3">
            <span className="text-white font-bold text-lg">Net Profit</span>
            <span
              className={`font-bold text-2xl ${
                netProfit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(netProfit)}
            </span>
          </div>
        </div>
      </Card>

      {/* Quick Tips */}
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <h3 className="text-blue-400 font-medium mb-2">Tips for Better Tracking</h3>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>- Upload receipts for all purchases to track expenses accurately</li>
          <li>- Invoice customers promptly after completing work</li>
          <li>- Review your P&L monthly to understand your business health</li>
        </ul>
      </Card>
    </div>
  );
}

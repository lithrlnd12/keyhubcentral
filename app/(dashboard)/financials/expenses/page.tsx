'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Receipt,
  Filter,
  Calendar,
  Building2,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { useExpenses } from '@/lib/hooks/useExpenses';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import { getExpenseCategoryLabel, EXPENSE_CATEGORIES, ExpenseCategory, ExpenseEntity } from '@/types/expense';
import { cn } from '@/lib/utils';

export default function ExpensesPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') as ExpenseCategory | null;
  const initialEntity = searchParams.get('entity') as ExpenseEntity | null;

  const { expenses, loading } = useExpenses({ realtime: true });
  const { user, getIdToken } = useAuth();

  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | 'all'>(initialCategory || 'all');
  const [entityFilter, setEntityFilter] = useState<ExpenseEntity | 'all'>(initialEntity || 'all');
  const [dateRange, setDateRange] = useState<'month' | 'quarter' | 'year' | 'all'>('all');
  const [selectedExpense, setSelectedExpense] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    let filtered = [...expenses];

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter((exp) => exp.category === categoryFilter);
    }

    // Entity filter
    if (entityFilter !== 'all') {
      filtered = filtered.filter((exp) => exp.entity === entityFilter);
    }

    // Date range filter
    if (dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((exp) => exp.date.toDate() >= startDate);
    }

    // Sort by date descending
    filtered.sort((a, b) => b.date.toMillis() - a.date.toMillis());

    return filtered;
  }, [expenses, categoryFilter, entityFilter, dateRange]);

  // Calculate totals
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Get selected expense for detail view
  const selectedExpenseData = selectedExpense
    ? expenses.find((exp) => exp.id === selectedExpense)
    : null;

  // Sync to Google Sheets
  const handleSyncToSheets = async () => {
    if (!user) return;
    setSyncing(true);
    setSyncMessage(null);

    try {
      const token = await getIdToken();
      if (!token) {
        setSyncMessage('Error: Authentication required');
        setSyncing(false);
        return;
      }
      const response = await fetch('/api/sheets/sync-expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSyncMessage('Expenses synced to Google Sheets!');
      } else {
        const data = await response.json();
        setSyncMessage(`Error: ${data.error || 'Failed to sync'}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncMessage('Failed to sync to Google Sheets');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMessage(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/financials/pnl"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to P&L
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Expenses</h1>
            <p className="text-gray-400">
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} •{' '}
              {formatCurrency(totalAmount)} total
            </p>
          </div>

          <button
            onClick={handleSyncToSheets}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {syncing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            {syncing ? 'Syncing...' : 'Sync to Sheets'}
          </button>
        </div>

        {syncMessage && (
          <p
            className={cn(
              'mt-2 text-sm',
              syncMessage.includes('Error') ? 'text-red-400' : 'text-green-400'
            )}
          >
            {syncMessage}
          </p>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | 'all')}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="all">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Entity Filter */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Entity</label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value as ExpenseEntity | 'all')}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="all">All Entities</option>
                <option value="kd">Keynote Digital</option>
                <option value="kts">Key Trade Solutions</option>
                <option value="kr">Key Renovations</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Period</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
                className="px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              >
                <option value="all">All Time</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {filteredExpenses.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No expenses found</h3>
                <p className="text-gray-400">
                  {categoryFilter !== 'all' || entityFilter !== 'all' || dateRange !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Add receipts to P&L to see expenses here'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredExpenses.map((expense) => (
              <button
                key={expense.id}
                type="button"
                onClick={() => setSelectedExpense(expense.id)}
                className="w-full text-left"
              >
                <Card
                  className={cn(
                    'cursor-pointer transition-colors',
                    selectedExpense === expense.id
                      ? 'border-brand-gold'
                      : 'hover:border-gray-700'
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10">
                          <Receipt className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                          <h3 className="text-white font-medium">{expense.description}</h3>
                          <p className="text-gray-400 text-sm">
                            {expense.vendor || 'Unknown Vendor'}
                          </p>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDate(expense.date.toDate())}
                            </span>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              {expense.entity.toUpperCase()}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-gray-800 rounded text-gray-400">
                              {getExpenseCategoryLabel(expense.category)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-red-400 font-bold">{formatCurrency(expense.amount)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </button>
            ))
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle>Expense Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedExpenseData ? (
                <div className="space-y-4">
                  {/* Receipt Image */}
                  {selectedExpenseData.receiptImageUrl && (
                    <div className="relative aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden">
                      <Image
                        src={selectedExpenseData.receiptImageUrl}
                        alt="Receipt"
                        fill
                        className="object-contain"
                      />
                      <a
                        href={selectedExpenseData.receiptImageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4 text-white" />
                      </a>
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-400">Description</p>
                      <p className="text-white">{selectedExpenseData.description}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Vendor</p>
                      <p className="text-white">{selectedExpenseData.vendor || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Amount</p>
                      <p className="text-red-400 font-bold text-lg">
                        {formatCurrency(selectedExpenseData.amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Date</p>
                      <p className="text-white">
                        {formatDate(selectedExpenseData.date.toDate())}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Category</p>
                      <p className="text-white">
                        {getExpenseCategoryLabel(selectedExpenseData.category)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Entity</p>
                      <p className="text-white">
                        {selectedExpenseData.entity === 'kd'
                          ? 'Keynote Digital'
                          : selectedExpenseData.entity === 'kts'
                          ? 'Key Trade Solutions'
                          : 'Key Renovations'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Added By</p>
                      <p className="text-white">{selectedExpenseData.createdByName}</p>
                    </div>

                    {/* Link to Receipt */}
                    {selectedExpenseData.receiptId && (
                      <Link
                        href={`/kts/inventory/receipts/${selectedExpenseData.receiptId}`}
                        className="flex items-center gap-2 text-brand-gold hover:underline text-sm"
                      >
                        <Receipt className="w-4 h-4" />
                        View Receipt Details
                      </Link>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">
                    Select an expense to view details
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

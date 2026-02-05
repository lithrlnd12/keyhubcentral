'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt, Search, Upload, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useAuth, useContractorExpenses } from '@/lib/hooks';
import { formatCurrency } from '@/lib/utils/formatters';
import { Expense, ExpenseCategory, getExpenseCategoryLabel } from '@/types/expense';

const CATEGORY_OPTIONS = [
  { value: '', label: 'All Categories' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'materials', label: 'Materials' },
  { value: 'tools', label: 'Tools' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'other', label: 'Other' },
];

export default function PortalExpensesPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const {
    expenses,
    loading,
    stats,
    categoryFilter,
    setCategoryFilter,
  } = useContractorExpenses({
    contractorId: user?.uid || '',
    realtime: true,
  });

  // Client-side search filter
  const filteredExpenses = search
    ? expenses.filter(
        (exp) =>
          exp.description?.toLowerCase().includes(search.toLowerCase()) ||
          exp.vendor?.toLowerCase().includes(search.toLowerCase())
      )
    : expenses;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

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
          <h1 className="text-2xl font-bold text-white">Expenses</h1>
          <p className="text-gray-400 mt-1">
            Expenses from your uploaded receipts
          </p>
        </div>
        <Link href="/portal/inventory/receipts">
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Upload Receipt
          </Button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{formatCurrency(stats.totalExpenses)}</p>
          <p className="text-sm text-gray-500">Total Expenses</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{stats.expenseCount}</p>
          <p className="text-sm text-gray-500">Transactions</p>
        </Card>
        {Object.keys(stats.expensesByCategory).length > 0 && (
          <>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(stats.expensesByCategory['materials'] || 0)}
              </p>
              <p className="text-sm text-gray-500">Materials</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">
                {formatCurrency(stats.expensesByCategory['fuel'] || 0)}
              </p>
              <p className="text-sm text-gray-500">Fuel</p>
            </Card>
          </>
        )}
      </div>

      {/* Info Box */}
      <Card className="p-4 border-blue-500/20 bg-blue-500/5">
        <p className="text-blue-400 text-sm">
          Expenses are automatically created from receipts you upload. Upload receipts in the{' '}
          <Link href="/portal/inventory/receipts" className="underline hover:text-blue-300">
            Inventory section
          </Link>{' '}
          and they will appear here once processed.
        </p>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search expenses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={categoryFilter || ''}
            onChange={(e) =>
              setCategoryFilter(e.target.value ? (e.target.value as ExpenseCategory) : undefined)
            }
            options={CATEGORY_OPTIONS}
            className="w-full sm:w-48"
          />
        </div>
      </Card>

      {/* Expenses List */}
      {filteredExpenses.length === 0 ? (
        <Card className="p-8 text-center">
          <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 mb-4">
            {search || categoryFilter ? 'No expenses match your filters' : 'No expenses yet'}
          </p>
          {!search && !categoryFilter && (
            <Link href="/portal/inventory/receipts">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First Receipt
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense: Expense) => (
            <Card key={expense.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-red-500/10 rounded-lg">
                    <Receipt className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{expense.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {expense.vendor && (
                        <span className="text-sm text-gray-400">{expense.vendor}</span>
                      )}
                      <span className="text-sm text-gray-500">
                        {formatDate(expense.date)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4">
                  <Badge variant="default">
                    {getExpenseCategoryLabel(expense.category)}
                  </Badge>
                  <p className="text-white font-bold text-lg">
                    {formatCurrency(expense.amount)}
                  </p>
                  {expense.receiptImageUrl && (
                    <a
                      href={expense.receiptImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-gold"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Category Breakdown */}
      {Object.keys(stats.expensesByCategory).length > 0 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold text-white mb-4">Expense Breakdown</h2>
          <div className="space-y-3">
            {Object.entries(stats.expensesByCategory)
              .sort((a, b) => b[1] - a[1])
              .map(([category, amount]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-gray-400">
                    {getExpenseCategoryLabel(category as ExpenseCategory)}
                  </span>
                  <span className="text-white font-medium">{formatCurrency(amount)}</span>
                </div>
              ))}
          </div>
        </Card>
      )}
    </div>
  );
}

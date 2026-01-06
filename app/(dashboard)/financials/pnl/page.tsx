'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Building2, ExternalLink } from 'lucide-react';

// Dynamic import for PDF button (SSR disabled for @react-pdf/renderer)
const PnLPDFButton = dynamic(
  () => import('@/components/pdf/PnLPDFButton').then((mod) => mod.PnLPDFButton),
  { ssr: false, loading: () => null }
);
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { useInvoices } from '@/lib/hooks/useInvoices';
import { useJobs } from '@/lib/hooks/useJobs';
import { useExpenses } from '@/lib/hooks/useExpenses';
import {
  calculateCombinedPnL,
  calculateEntityPnL,
  getDateRangePresets,
  filterInvoicesByDateRange,
  calculateProfitMargin,
  groupEntriesByCategory,
} from '@/lib/utils/pnl';
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { EXPENSE_CATEGORIES } from '@/types/expense';

export default function PnLPage() {
  const { invoices, loading: invoicesLoading } = useInvoices({ realtime: true });
  const { jobs, loading: jobsLoading } = useJobs({ realtime: true });
  const { expenses, loading: expensesLoading } = useExpenses({ realtime: true });

  const datePresets = getDateRangePresets();
  const [selectedPreset, setSelectedPreset] = useState(0); // This Month by default
  const [selectedEntity, setSelectedEntity] = useState<'all' | 'kd' | 'kts' | 'kr'>('all');

  const loading = invoicesLoading || jobsLoading || expensesLoading;

  // Filter invoices by date range
  const filteredInvoices = useMemo(() => {
    const preset = datePresets[selectedPreset];
    return filterInvoicesByDateRange(invoices, preset.start, preset.end);
  }, [invoices, selectedPreset, datePresets]);

  // Filter expenses by date range
  const filteredExpenses = useMemo(() => {
    const preset = datePresets[selectedPreset];
    return expenses.filter((exp) => {
      const expenseDate = exp.date.toMillis();
      return expenseDate >= preset.start.getTime() && expenseDate <= preset.end.getTime();
    });
  }, [expenses, selectedPreset, datePresets]);

  // Calculate P&L
  const pnlData = useMemo(() => {
    return calculateCombinedPnL(filteredInvoices, jobs, filteredExpenses);
  }, [filteredInvoices, jobs, filteredExpenses]);

  // Get selected entity P&L
  const selectedPnL = useMemo(() => {
    if (selectedEntity === 'all') {
      return {
        revenue: pnlData.totalRevenue - pnlData.intercompanyRevenue,
        expenses: pnlData.totalExpenses - pnlData.intercompanyExpenses,
        netIncome: pnlData.netIncome,
        entries: pnlData.entities.flatMap((e) => e.entries),
      };
    }
    const entity = pnlData.entities.find((e) => e.entity === selectedEntity);
    return entity || { revenue: 0, expenses: 0, netIncome: 0, entries: [] };
  }, [pnlData, selectedEntity]);

  const profitMargin = calculateProfitMargin(selectedPnL.revenue, selectedPnL.expenses);
  const groupedEntries = groupEntriesByCategory(selectedPnL.entries);

  // Format date range for PDF export
  const currentDateRange = useMemo(() => {
    const preset = datePresets[selectedPreset];
    const formatDate = (d: Date) =>
      d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${formatDate(preset.start)} - ${formatDate(preset.end)}`;
  }, [datePresets, selectedPreset]);

  const entityNameMap: Record<string, string> = {
    all: 'Combined',
    kd: 'Keynote Digital',
    kts: 'Key Trade Solutions',
    kr: 'Key Renovations',
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
          <h1 className="text-2xl font-bold text-white">Profit & Loss</h1>
          <p className="text-gray-400 mt-1">Financial performance by entity</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Export PDF Button */}
          <PnLPDFButton
            data={selectedPnL}
            combinedData={selectedEntity === 'all' ? pnlData : undefined}
            entityName={entityNameMap[selectedEntity]}
            entityKey={selectedEntity}
            dateRange={currentDateRange}
            datePresetLabel={datePresets[selectedPreset].label}
          />

          {/* Date Range Selector */}
          <div className="flex items-center gap-2">
            {datePresets.map((preset, index) => (
              <button
                key={preset.label}
                onClick={() => setSelectedPreset(index)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedPreset === index
                    ? 'bg-brand-gold text-brand-black'
                    : 'bg-brand-charcoal text-gray-400 hover:text-white'
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Entity Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-4">
        {[
          { value: 'all', label: 'Combined' },
          { value: 'kd', label: 'Keynote Digital' },
          { value: 'kts', label: 'Key Trade Solutions' },
          { value: 'kr', label: 'Key Renovations' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedEntity(tab.value as typeof selectedEntity)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              selectedEntity === tab.value
                ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/30'
                : 'text-gray-400 hover:text-white'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Revenue</p>
                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(selectedPnL.revenue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Expenses</p>
                <p className="text-xl font-bold text-red-400">
                  {formatCurrency(selectedPnL.expenses)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brand-gold/10">
                <DollarSign className="w-5 h-5 text-brand-gold" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Net Income</p>
                <p
                  className={cn(
                    'text-xl font-bold',
                    selectedPnL.netIncome >= 0 ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {formatCurrency(selectedPnL.netIncome)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Building2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Profit Margin</p>
                <p
                  className={cn(
                    'text-xl font-bold',
                    profitMargin >= 0 ? 'text-green-400' : 'text-red-400'
                  )}
                >
                  {profitMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Intercompany Notice */}
      {selectedEntity === 'all' && pnlData.intercompanyRevenue > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <p className="text-blue-400 text-sm">
            Intercompany transactions of {formatCurrency(pnlData.intercompanyRevenue)} have been
            eliminated from the combined view.
          </p>
        </div>
      )}

      {/* P&L Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-green-400">Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(groupedEntries).filter(([_, v]) => v.revenue > 0).length === 0 ? (
              <p className="text-gray-500 text-sm">No revenue recorded for this period</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedEntries)
                  .filter(([_, v]) => v.revenue > 0)
                  .map(([category, values]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-gray-400">{category}</span>
                      <span className="text-green-400 font-medium">
                        {formatCurrency(values.revenue)}
                      </span>
                    </div>
                  ))}
                <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
                  <span className="text-white font-medium">Total Revenue</span>
                  <span className="text-green-400 font-bold">
                    {formatCurrency(selectedPnL.revenue)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-red-400">Expenses</CardTitle>
              <Link
                href={`/financials/expenses${selectedEntity !== 'all' ? `?entity=${selectedEntity}` : ''}`}
                className="text-xs text-gray-400 hover:text-brand-gold flex items-center gap-1"
              >
                View All
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {Object.entries(groupedEntries).filter(([_, v]) => v.expense > 0).length === 0 ? (
              <p className="text-gray-500 text-sm">No expenses recorded for this period</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(groupedEntries)
                  .filter(([_, v]) => v.expense > 0)
                  .map(([category, values]) => {
                    // Check if this is an expense category that can be drilled down
                    const expenseCategoryMatch = EXPENSE_CATEGORIES.find(
                      (ec) => ec.label.toLowerCase() === category.toLowerCase()
                    );
                    const isClickable = expenseCategoryMatch !== undefined;
                    const categoryParam = expenseCategoryMatch?.value || '';
                    const entityParam = selectedEntity !== 'all' ? `&entity=${selectedEntity}` : '';
                    const href = isClickable
                      ? `/financials/expenses?category=${categoryParam}${entityParam}`
                      : undefined;

                    return (
                      <div key={category} className="flex items-center justify-between">
                        {isClickable ? (
                          <Link
                            href={href!}
                            className="text-gray-400 hover:text-brand-gold transition-colors flex items-center gap-1"
                          >
                            {category}
                            <ExternalLink className="w-3 h-3 opacity-50" />
                          </Link>
                        ) : (
                          <span className="text-gray-400">{category}</span>
                        )}
                        <span className="text-red-400 font-medium">
                          {formatCurrency(values.expense)}
                        </span>
                      </div>
                    );
                  })}
                <div className="border-t border-gray-800 pt-3 flex items-center justify-between">
                  <span className="text-white font-medium">Total Expenses</span>
                  <span className="text-red-400 font-bold">
                    {formatCurrency(selectedPnL.expenses)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Entity Comparison (when viewing combined) */}
      {selectedEntity === 'all' && (
        <Card>
          <CardHeader>
            <CardTitle>Entity Comparison</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-3">
                    Entity
                  </th>
                  <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                    Revenue
                  </th>
                  <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                    Expenses
                  </th>
                  <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                    Net Income
                  </th>
                  <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                    Margin
                  </th>
                </tr>
              </thead>
              <tbody>
                {pnlData.entities.map((entity) => {
                  const margin = calculateProfitMargin(entity.revenue, entity.expenses);
                  return (
                    <tr key={entity.entity} className="border-b border-gray-800/50">
                      <td className="px-6 py-4 text-white font-medium">{entity.entityName}</td>
                      <td className="px-6 py-4 text-right text-green-400">
                        {formatCurrency(entity.revenue)}
                      </td>
                      <td className="px-6 py-4 text-right text-red-400">
                        {formatCurrency(entity.expenses)}
                      </td>
                      <td
                        className={cn(
                          'px-6 py-4 text-right font-medium',
                          entity.netIncome >= 0 ? 'text-green-400' : 'text-red-400'
                        )}
                      >
                        {formatCurrency(entity.netIncome)}
                      </td>
                      <td
                        className={cn(
                          'px-6 py-4 text-right',
                          margin >= 0 ? 'text-green-400' : 'text-red-400'
                        )}
                      >
                        {margin.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

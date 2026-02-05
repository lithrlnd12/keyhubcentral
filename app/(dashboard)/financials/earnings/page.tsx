'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Users,
  Award,
  Briefcase,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { RatingDisplay } from '@/components/contractors/RatingDisplay';
import { useContractors } from '@/lib/hooks/useContractors';
import { useJobs } from '@/lib/hooks/useJobs';
import { useInvoices } from '@/lib/hooks/useInvoices';
import {
  calculateAllContractorEarnings,
  getEarningsSummary,
} from '@/lib/utils/earnings';
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

export default function EarningsPage() {
  const { contractors, loading: contractorsLoading } = useContractors({ realtime: true });
  const { jobs, loading: jobsLoading } = useJobs({ realtime: true });
  const { invoices, loading: invoicesLoading } = useInvoices({ realtime: true });

  const loading = contractorsLoading || jobsLoading || invoicesLoading;

  // Calculate earnings for all contractors
  const earnings = useMemo(() => {
    return calculateAllContractorEarnings(contractors, jobs, invoices);
  }, [contractors, jobs, invoices]);

  // Get summary stats
  const summary = useMemo(() => {
    return getEarningsSummary(earnings);
  }, [earnings]);

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
        <h1 className="text-2xl font-bold text-white">Contractor Earnings</h1>
        <p className="text-gray-400 mt-1">
          Track payments, commissions, and earnings for all contractors
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Total Paid</p>
                <p className="text-xl font-bold text-green-400">
                  {formatCurrency(summary.totalPaid)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-xl font-bold text-yellow-400">
                  {formatCurrency(summary.totalPending)}
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
                <p className="text-gray-400 text-sm">Total Earnings</p>
                <p className="text-xl font-bold text-brand-gold">
                  {formatCurrency(summary.totalEarnings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-gray-400 text-sm">Active Contractors</p>
                <p className="text-xl font-bold text-blue-400">{earnings.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Earner Highlight */}
      {summary.topEarner && (
        <Card className="border-brand-gold/30">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-brand-gold/10">
                <Award className="w-8 h-8 text-brand-gold" />
              </div>
              <div className="flex-1">
                <p className="text-gray-400 text-sm">Top Earner</p>
                <p className="text-xl font-bold text-white">{summary.topEarner.contractorName}</p>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                  <span>{summary.topEarner.jobsCompleted} jobs completed</span>
                  <RatingDisplay rating={summary.topEarner.rating} size="sm" />
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-sm">Total Earnings</p>
                <p className="text-2xl font-bold text-brand-gold">
                  {formatCurrency(summary.topEarner.totalEarnings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Earnings Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Contractor Earnings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {earnings.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No contractor earnings data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-400 text-sm font-medium px-6 py-3">
                      Contractor
                    </th>
                    <th className="text-center text-gray-400 text-sm font-medium px-6 py-3">
                      Rating
                    </th>
                    <th className="text-center text-gray-400 text-sm font-medium px-6 py-3">
                      Jobs
                    </th>
                    <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                      Labor
                    </th>
                    <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                      Commission
                    </th>
                    <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                      Total
                    </th>
                    <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                      Paid
                    </th>
                    <th className="text-right text-gray-400 text-sm font-medium px-6 py-3">
                      Pending
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {earnings.map((earning, index) => (
                    <tr
                      key={earning.contractorId}
                      className={cn(
                        'border-b border-gray-800/50',
                        index === 0 && 'bg-brand-gold/5'
                      )}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/kts/${earning.contractorId}`}
                          className="text-white font-medium hover:text-brand-gold transition-colors"
                        >
                          {earning.contractorName}
                        </Link>
                        {index === 0 && (
                          <span className="ml-2 text-xs text-brand-gold">Top Earner</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <RatingDisplay rating={earning.rating} size="sm" />
                      </td>
                      <td className="px-6 py-4 text-center text-gray-400">
                        {earning.jobsCompleted}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400">
                        {formatCurrency(earning.totalLabor)}
                      </td>
                      <td className="px-6 py-4 text-right text-gray-400">
                        {formatCurrency(earning.totalCommission)}
                        {earning.commissionRate > 0 && (
                          <span className="text-xs text-gray-500 ml-1">
                            ({(earning.commissionRate * 100).toFixed(0)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-brand-gold">
                        {formatCurrency(earning.totalEarnings)}
                      </td>
                      <td className="px-6 py-4 text-right text-green-400">
                        {formatCurrency(earning.paidPayments)}
                      </td>
                      <td className="px-6 py-4 text-right text-yellow-400">
                        {formatCurrency(earning.pendingPayments)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-charcoal">
                    <td className="px-6 py-4 font-semibold text-white" colSpan={3}>
                      Totals
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {formatCurrency(earnings.reduce((sum, e) => sum + e.totalLabor, 0))}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-white">
                      {formatCurrency(earnings.reduce((sum, e) => sum + e.totalCommission, 0))}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-brand-gold">
                      {formatCurrency(summary.totalEarnings)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-green-400">
                      {formatCurrency(summary.totalPaid)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-yellow-400">
                      {formatCurrency(summary.totalPending)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

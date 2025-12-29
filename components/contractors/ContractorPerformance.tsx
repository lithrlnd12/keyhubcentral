'use client';

import { DollarSign, Users, Clock, Wrench, Star, Briefcase, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Contractor, getRatingTier, getCommissionRate } from '@/types/contractor';
import { RatingDisplay } from './RatingDisplay';
import { formatCurrency } from '@/lib/utils/formatters';
import { useJobs } from '@/lib/hooks/useJobs';
import { useInvoices } from '@/lib/hooks/useInvoices';
import { calculateContractorEarnings } from '@/lib/utils/earnings';

interface ContractorPerformanceProps {
  contractor: Contractor;
}

interface RatingBarProps {
  label: string;
  value: number;
  icon: React.ReactNode;
}

function RatingBar({ label, value, icon }: RatingBarProps) {
  const percentage = (value / 5) * 100;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-400">
          {icon}
          <span>{label}</span>
        </div>
        <span className="text-white font-medium">{value.toFixed(1)}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-gold rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function ContractorPerformance({ contractor }: ContractorPerformanceProps) {
  const { rating } = contractor;
  const tier = getRatingTier(rating.overall);
  const commissionRate = getCommissionRate(tier);

  // Fetch jobs and invoices to calculate earnings
  const { jobs, loading: jobsLoading } = useJobs();
  const { invoices, loading: invoicesLoading } = useInvoices();

  const isLoadingEarnings = jobsLoading || invoicesLoading;
  const earnings = !isLoadingEarnings && jobs && invoices
    ? calculateContractorEarnings(contractor, jobs, invoices)
    : null;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle>Overall Rating</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-4xl font-bold text-white mb-2">
              {rating.overall.toFixed(1)}
            </div>
            <RatingDisplay rating={rating.overall} showTier size="lg" />
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Commission Rate</span>
              <span className="text-xl font-bold text-brand-gold">
                {(commissionRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rating Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RatingBar
            label="Customer Satisfaction"
            value={rating.customer}
            icon={<Users className="w-4 h-4" />}
          />
          <RatingBar
            label="Speed & Timeliness"
            value={rating.speed}
            icon={<Clock className="w-4 h-4" />}
          />
          <RatingBar
            label="Warranty Performance"
            value={rating.warranty}
            icon={<Wrench className="w-4 h-4" />}
          />
          <RatingBar
            label="Internal Evaluation"
            value={rating.internal}
            icon={<Star className="w-4 h-4" />}
          />

          <div className="pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Overall = Customer (40%) + Speed (20%) + Warranty (20%) + Internal (20%)
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader>
          <CardTitle>Revenue to Date</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingEarnings ? (
            <div className="flex items-center justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : earnings ? (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="text-3xl font-bold text-brand-gold">
                  {formatCurrency(earnings.totalEarnings)}
                </div>
                <p className="text-sm text-gray-400 mt-1">Total Earnings</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <Briefcase className="w-4 h-4" />
                    <span>Jobs Completed</span>
                  </div>
                  <p className="text-xl font-semibold text-white">{earnings.jobsCompleted}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>Commission</span>
                  </div>
                  <p className="text-xl font-semibold text-white">{formatCurrency(earnings.totalCommission)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-800">
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Labor</span>
                  </div>
                  <p className="text-xl font-semibold text-white">{formatCurrency(earnings.totalLabor)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span>Paid</span>
                  </div>
                  <p className="text-xl font-semibold text-green-500">{formatCurrency(earnings.paidPayments)}</p>
                </div>
              </div>

              {earnings.pendingPayments > 0 && (
                <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Pending Payments</span>
                    <span className="text-lg font-semibold text-yellow-500">
                      {formatCurrency(earnings.pendingPayments)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              No earnings data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

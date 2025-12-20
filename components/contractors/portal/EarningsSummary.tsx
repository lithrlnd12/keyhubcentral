'use client';

import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/formatters';

interface EarningsSummaryProps {
  // In a real app, these would come from a hook
  totalEarnings?: number;
  pendingPayments?: number;
  completedJobs?: number;
  avgJobValue?: number;
}

export function EarningsSummary({
  totalEarnings = 12450.00,
  pendingPayments = 2850.00,
  completedJobs = 24,
  avgJobValue = 518.75,
}: EarningsSummaryProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-green-500/20">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(totalEarnings)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-yellow-500/20">
              <Clock className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Pending Payments</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(pendingPayments)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-blue-500/20">
              <CheckCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Completed Jobs</p>
              <p className="text-2xl font-bold text-white">{completedJobs}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-brand-gold/20">
              <TrendingUp className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Avg Job Value</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(avgJobValue)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

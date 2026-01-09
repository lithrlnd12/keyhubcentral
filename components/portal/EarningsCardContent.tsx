'use client';

import { DollarSign, Clock, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/formatters';

interface Payment {
  id: string;
  date: string;
  amount: number;
  jobCount: number;
  status: 'paid' | 'pending' | 'processing';
}

// Mock data - will be replaced with real data
const mockPayments: Payment[] = [
  {
    id: '1',
    date: '2024-12-15',
    amount: 2450.00,
    jobCount: 5,
    status: 'paid',
  },
  {
    id: '2',
    date: '2024-12-08',
    amount: 1890.00,
    jobCount: 4,
    status: 'paid',
  },
  {
    id: '3',
    date: '2024-12-01',
    amount: 3200.00,
    jobCount: 6,
    status: 'paid',
  },
  {
    id: '4',
    date: '2024-12-22',
    amount: 1650.00,
    jobCount: 3,
    status: 'pending',
  },
  {
    id: '5',
    date: '2024-12-20',
    amount: 1200.00,
    jobCount: 2,
    status: 'processing',
  },
];

function getStatusBadge(status: Payment['status']) {
  switch (status) {
    case 'paid':
      return <Badge variant="success">Paid</Badge>;
    case 'pending':
      return <Badge variant="warning">Pending</Badge>;
    case 'processing':
      return <Badge variant="info">Processing</Badge>;
  }
}

export function EarningsCardContent() {
  const totalEarnings = mockPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = mockPayments
    .filter((p) => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalJobs = mockPayments.reduce((sum, p) => sum + p.jobCount, 0);

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="flex justify-center mb-1">
            <DollarSign className="w-4 h-4 text-green-400" />
          </div>
          <p className="text-lg font-bold text-white">{formatCurrency(totalEarnings)}</p>
          <p className="text-xs text-gray-500">Earned</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="flex justify-center mb-1">
            <Clock className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-lg font-bold text-white">{formatCurrency(pendingAmount)}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-3 text-center">
          <div className="flex justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-gold" />
          </div>
          <p className="text-lg font-bold text-white">{totalJobs}</p>
          <p className="text-xs text-gray-500">Jobs</p>
        </div>
      </div>

      {/* Payment History */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Payments</h4>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {mockPayments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-center justify-between p-2 bg-gray-800/30 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm text-white">
                    {new Date(payment.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                  <p className="text-xs text-gray-500">{payment.jobCount} jobs</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(payment.status)}
                <p className="text-sm font-semibold text-gold min-w-[80px] text-right">
                  {formatCurrency(payment.amount)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

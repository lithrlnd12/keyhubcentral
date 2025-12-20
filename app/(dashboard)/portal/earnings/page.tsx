'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/formatters';

interface Payment {
  id: string;
  date: string;
  amount: number;
  jobCount: number;
  status: 'paid' | 'pending' | 'processing';
  method: string;
}

// Mock data - will be replaced with real data
const mockPayments: Payment[] = [
  {
    id: '1',
    date: '2024-12-15',
    amount: 2450.00,
    jobCount: 5,
    status: 'paid',
    method: 'ACH Direct Deposit',
  },
  {
    id: '2',
    date: '2024-12-08',
    amount: 1890.00,
    jobCount: 4,
    status: 'paid',
    method: 'ACH Direct Deposit',
  },
  {
    id: '3',
    date: '2024-12-01',
    amount: 3200.00,
    jobCount: 6,
    status: 'paid',
    method: 'ACH Direct Deposit',
  },
  {
    id: '4',
    date: '2024-12-22',
    amount: 1650.00,
    jobCount: 3,
    status: 'pending',
    method: 'ACH Direct Deposit',
  },
  {
    id: '5',
    date: '2024-12-20',
    amount: 1200.00,
    jobCount: 2,
    status: 'processing',
    method: 'ACH Direct Deposit',
  },
];

const periodOptions = [
  { value: 'month', label: 'This Month' },
  { value: 'quarter', label: 'This Quarter' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
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

export default function EarningsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [period, setPeriod] = useState('month');

  // Only contractors can access this page
  useEffect(() => {
    if (!authLoading && user && user.role !== 'contractor') {
      router.push('/overview');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || user.role !== 'contractor') {
    return null;
  }

  const totalEarnings = mockPayments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0);

  const pendingAmount = mockPayments
    .filter((p) => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + p.amount, 0);

  const totalJobs = mockPayments.reduce((sum, p) => sum + p.jobCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/portal">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Earnings</h1>
            <p className="text-gray-400 mt-1">
              View your payment history and earnings.
            </p>
          </div>
        </div>

        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/20">
                <DollarSign className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Earned</p>
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
                <Calendar className="w-6 h-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(pendingAmount)}
                </p>
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
                <p className="text-sm text-gray-400">Jobs Completed</p>
                <p className="text-2xl font-bold text-white">{totalJobs}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Period Filter */}
      <div className="flex justify-end">
        <div className="w-48">
          <Select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={periodOptions}
          />
        </div>
      </div>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">
                    Date
                  </th>
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">
                    Jobs
                  </th>
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">
                    Method
                  </th>
                  <th className="text-left text-sm font-medium text-gray-400 pb-3">
                    Status
                  </th>
                  <th className="text-right text-sm font-medium text-gray-400 pb-3">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {mockPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="py-4 text-white">
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-gray-400">{payment.jobCount} jobs</td>
                    <td className="py-4 text-gray-400">{payment.method}</td>
                    <td className="py-4">{getStatusBadge(payment.status)}</td>
                    <td className="py-4 text-right font-semibold text-brand-gold">
                      {formatCurrency(payment.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

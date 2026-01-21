'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/hooks';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  getPayouts,
  getPayoutSummary,
  markPayoutCompleted,
  subscribeToPayouts,
} from '@/lib/firebase/payouts';
import { Payout, PayoutStatus, PayoutType, PayoutToEntity, PayoutSummary } from '@/types/payout';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  Building2,
  ArrowRight,
  ExternalLink,
  Loader2,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function PayoutsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const userRole = user?.role;
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<PayoutStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<PayoutType | ''>('');
  const [entityFilter, setEntityFilter] = useState<PayoutToEntity | ''>('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [payoutsData, summaryData] = await Promise.all([
        getPayouts({
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          toEntity: entityFilter || undefined,
        }),
        getPayoutSummary(),
      ]);
      setPayouts(payoutsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Failed to load payouts:', error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, entityFilter]);

  // Auth check
  useEffect(() => {
    if (!authLoading && (!user || !['owner', 'admin'].includes(userRole || ''))) {
      router.push('/overview');
    }
  }, [user, userRole, authLoading, router]);

  // Load data on mount and when filters change
  useEffect(() => {
    if (user && ['owner', 'admin'].includes(userRole || '')) {
      loadData();

      // Subscribe to real-time updates
      const unsubscribe = subscribeToPayouts((updatedPayouts) => {
        setPayouts(updatedPayouts);
      });

      return () => unsubscribe();
    }
  }, [user, userRole, loadData]);

  const handleMarkCompleted = async (payoutId: string) => {
    if (!user) return;

    setProcessingId(payoutId);
    try {
      await markPayoutCompleted(payoutId, user.uid);
      await loadData();
    } catch (error) {
      console.error('Failed to mark payout as completed:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (timestamp: { seconds: number } | null | undefined) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleDateString();
  };

  const getStatusConfig = (status: PayoutStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
          icon: <Clock className="w-4 h-4" />,
        };
      case 'processing':
        return {
          label: 'Processing',
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/20',
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
        };
      case 'completed':
        return {
          label: 'Completed',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
          icon: <CheckCircle2 className="w-4 h-4" />,
        };
      case 'failed':
        return {
          label: 'Failed',
          color: 'text-red-400',
          bgColor: 'bg-red-500/20',
          icon: <XCircle className="w-4 h-4" />,
        };
    }
  };

  const filteredPayouts = payouts.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (typeFilter && p.type !== typeFilter) return false;
    if (entityFilter && p.toEntity !== entityFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Payouts</h1>
          <p className="text-gray-400 text-sm">
            Track and manage payouts to KD and KTS
          </p>
        </div>
        <Button onClick={loadData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Pending</p>
                  <p className="text-lg font-bold text-white">{summary.totalPending}</p>
                  <p className="text-xs text-yellow-400">
                    {formatCurrency(summary.pendingAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <RefreshCw className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Processing</p>
                  <p className="text-lg font-bold text-white">{summary.totalProcessing}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Completed</p>
                  <p className="text-lg font-bold text-white">{summary.totalCompleted}</p>
                  <p className="text-xs text-green-400">
                    {formatCurrency(summary.completedAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">Failed</p>
                  <p className="text-lg font-bold text-white">{summary.totalFailed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">Filters:</span>
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PayoutStatus | '')}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as PayoutType | '')}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="">All Types</option>
              <option value="lead_fee">Lead Fee</option>
              <option value="labor">Labor</option>
            </select>

            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value as PayoutToEntity | '')}
              className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
            >
              <option value="">All Recipients</option>
              <option value="kd">Keynote Digital (KD)</option>
              <option value="kts">Key Trade Solutions (KTS)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payouts List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand-gold" />
            Payouts ({filteredPayouts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-gold" />
            </div>
          ) : filteredPayouts.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="text-gray-400">No payouts found</p>
              <p className="text-sm text-gray-500">
                Payouts are generated when jobs are marked as paid in full
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPayouts.map((payout) => {
                const statusConfig = getStatusConfig(payout.status);
                return (
                  <div
                    key={payout.id}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center gap-1">
                        <div className="p-2 bg-brand-gold/20 rounded-lg">
                          <Building2 className="w-5 h-5 text-brand-gold" />
                        </div>
                        <span className="text-xs text-gray-400 uppercase">
                          {payout.fromEntity}
                        </span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600" />
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`p-2 rounded-lg ${
                            payout.toEntity === 'kd'
                              ? 'bg-blue-500/20'
                              : 'bg-purple-500/20'
                          }`}
                        >
                          <Building2
                            className={`w-5 h-5 ${
                              payout.toEntity === 'kd'
                                ? 'text-blue-400'
                                : 'text-purple-400'
                            }`}
                          />
                        </div>
                        <span className="text-xs text-gray-400 uppercase">
                          {payout.toEntity}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {formatCurrency(payout.amount)}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${statusConfig.bgColor} ${statusConfig.color}`}
                          >
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-sm text-gray-400">
                            {payout.type === 'lead_fee' ? 'Lead Fee' : 'Labor'}
                          </span>
                          <span className="text-gray-600">•</span>
                          <Link
                            href={`/kr/${payout.jobId}`}
                            className="text-sm text-brand-gold hover:underline flex items-center gap-1"
                          >
                            {payout.jobNumber}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Created: {formatDate(payout.createdAt)}
                          {payout.processedAt && (
                            <> • Processed: {formatDate(payout.processedAt)}</>
                          )}
                        </p>
                        {payout.contractorName && (
                          <p className="text-xs text-gray-500">
                            Contractor: {payout.contractorName}
                          </p>
                        )}
                        {payout.leadSource && (
                          <p className="text-xs text-gray-500">
                            Source: {payout.leadSource}
                          </p>
                        )}
                        {payout.failureReason && (
                          <p className="text-xs text-red-400 flex items-center gap-1 mt-1">
                            <AlertCircle className="w-3 h-3" />
                            {payout.failureReason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/financials/invoices/${payout.invoiceId}`}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        View Invoice
                      </Link>
                      {payout.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarkCompleted(payout.id)}
                          disabled={processingId === payout.id}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          {processingId === payout.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Mark Paid
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

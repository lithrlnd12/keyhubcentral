'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Receipt,
  Plus,
  Search,
  Eye,
  CheckCircle,
  DollarSign,
  AlertCircle,
  Package,
  Briefcase,
  User,
} from 'lucide-react';
import { useReceipts } from '@/lib/hooks';
import { useJobs } from '@/lib/hooks/useJobs';
import { ReceiptStatus, getReceiptStatusLabel, getReceiptStatusColor } from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils/formatters';

export default function ReceiptsPage() {
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [contractorFilter, setContractorFilter] = useState('');
  const [jobFilter, setJobFilter] = useState('');

  const { receipts, loading, setStatus } = useReceipts({
    status: statusFilter as ReceiptStatus | undefined,
    realtime: true,
  });

  const { jobs } = useJobs({ realtime: true });

  const handleStatusFilter = (status: ReceiptStatus | '') => {
    setStatusFilter(status);
    setStatus(status as ReceiptStatus | undefined);
  };

  // Get unique contractors from receipts
  const contractors = useMemo(() => {
    const map = new Map<string, string>();
    receipts.forEach((r) => {
      if (r.contractorId && r.uploadedByName) {
        map.set(r.contractorId, r.uploadedByName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [receipts]);

  // Get unique jobs from receipts
  const linkedJobs = useMemo(() => {
    const jobIds = new Set(receipts.filter((r) => r.jobId).map((r) => r.jobId!));
    return jobs.filter((j) => jobIds.has(j.id));
  }, [receipts, jobs]);

  // Apply client-side filters
  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      if (contractorFilter && r.contractorId !== contractorFilter) return false;
      if (jobFilter && r.jobId !== jobFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesVendor = r.vendor?.toLowerCase().includes(q);
        const matchesUploader = r.uploadedByName?.toLowerCase().includes(q);
        if (!matchesVendor && !matchesUploader) return false;
      }
      return true;
    });
  }, [receipts, contractorFilter, jobFilter, searchQuery]);

  // Totals
  const totals = useMemo(() => {
    const needsReview = filteredReceipts.filter((r) => r.status === 'parsed' || r.status === 'verified');
    const addedToPL = filteredReceipts.filter((r) => r.status === 'added_to_pl');
    return {
      total: filteredReceipts.reduce((sum, r) => sum + (r.total || 0), 0),
      needsReviewCount: needsReview.length,
      needsReviewTotal: needsReview.reduce((sum, r) => sum + (r.total || 0), 0),
      addedToPLCount: addedToPL.length,
      addedToPLTotal: addedToPL.reduce((sum, r) => sum + (r.total || 0), 0),
    };
  }, [filteredReceipts]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/kts/inventory"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Receipts</h1>
            <p className="text-gray-400">Review, reimburse, and track all receipts</p>
          </div>
        </div>
        <Link
          href="/kts/inventory/receipts/new"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Upload Receipt
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Receipts</p>
          <p className="text-2xl font-bold text-white">{formatCurrency(totals.total)}</p>
          <p className="text-gray-500 text-xs">{filteredReceipts.length} receipts</p>
        </div>
        <div className="bg-brand-charcoal border border-yellow-500/20 rounded-xl p-4">
          <p className="text-yellow-400 text-sm">Needs Review</p>
          <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totals.needsReviewTotal)}</p>
          <p className="text-gray-500 text-xs">{totals.needsReviewCount} receipts</p>
        </div>
        <div className="bg-brand-charcoal border border-green-500/20 rounded-xl p-4">
          <p className="text-green-400 text-sm">Added to P&L</p>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(totals.addedToPLTotal)}</p>
          <p className="text-gray-500 text-xs">{totals.addedToPLCount} receipts</p>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3">
        {/* Status filters */}
        <div className="flex flex-wrap gap-2">
          {(['' , 'pending', 'parsed', 'verified', 'added_to_pl', 'error'] as const).map((status) => (
            <button
              key={status || 'all'}
              onClick={() => handleStatusFilter(status)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                statusFilter === status
                  ? 'bg-gold text-black'
                  : 'bg-gray-900 text-gray-400 hover:text-white'
              )}
            >
              {status ? getReceiptStatusLabel(status as ReceiptStatus) : 'All'}
            </button>
          ))}
        </div>

        {/* Search + dropdown filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor or uploader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold text-sm"
            />
          </div>

          <select
            value={contractorFilter}
            onChange={(e) => setContractorFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
          >
            <option value="">All Contractors</option>
            {contractors.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
          >
            <option value="">All Jobs</option>
            {linkedJobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.jobNumber ? `#${job.jobNumber}` : ''} {job.customer?.name || 'Unnamed'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm">
        {loading ? 'Loading...' : `${filteredReceipts.length} receipt${filteredReceipts.length !== 1 ? 's' : ''}`}
      </p>

      {/* Receipts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredReceipts.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No receipts found</h3>
          <p className="text-gray-400 mb-4">
            {statusFilter || contractorFilter || jobFilter || searchQuery
              ? 'Try adjusting your filters'
              : 'Upload your first receipt'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReceipts.map((receipt) => {
            const job = receipt.jobId ? jobs.find((j) => j.id === receipt.jobId) : null;
            return (
              <Link
                key={receipt.id}
                href={`/kts/inventory/receipts/${receipt.id}`}
                className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl hover:border-gold/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                    {receipt.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={receipt.imageUrl}
                        alt="Receipt"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Receipt className="h-5 w-5 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-white font-medium">
                        {receipt.vendor || 'Unknown Vendor'}
                      </p>
                      <span
                        className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          getReceiptStatusColor(receipt.status)
                        )}
                      >
                        {getReceiptStatusLabel(receipt.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400 mt-0.5">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {receipt.uploadedByName}
                      </span>
                      <span>{receipt.uploadedAt.toDate().toLocaleDateString()}</span>
                      {receipt.items.length > 0 && (
                        <span>{receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}</span>
                      )}
                    </div>
                    {/* Job + status badges */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {job && (
                        <span className="flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                          <Briefcase className="h-3 w-3" />
                          {job.jobNumber ? `#${job.jobNumber}` : job.customer?.name}
                        </span>
                      )}
                      {receipt.addedToInventory && (
                        <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <Package className="h-3 w-3" />
                          Inventory
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {receipt.total && (
                    <p className="text-white font-medium">
                      {formatCurrency(receipt.total)}
                    </p>
                  )}
                  <div className="flex items-center gap-1">
                    {receipt.status === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
                    {receipt.status === 'added_to_pl' && <DollarSign className="h-4 w-4 text-green-400" />}
                    {receipt.status === 'verified' && <CheckCircle className="h-4 w-4 text-green-400" />}
                    <Eye className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

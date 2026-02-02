'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt, Plus, Search, Eye, CheckCircle, DollarSign, AlertCircle } from 'lucide-react';
import { useReceipts } from '@/lib/hooks';
import { ReceiptStatus, getReceiptStatusLabel, getReceiptStatusColor } from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

export default function ReceiptsPage() {
  const [statusFilter, setStatusFilter] = useState<ReceiptStatus | ''>('');
  const { receipts, loading, setStatus } = useReceipts({
    status: statusFilter as ReceiptStatus | undefined,
    realtime: true,
  });

  const handleStatusFilter = (status: ReceiptStatus | '') => {
    setStatusFilter(status);
    setStatus(status as ReceiptStatus | undefined);
  };

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
            <p className="text-gray-400">AI-powered receipt parsing and tracking</p>
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleStatusFilter('')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            !statusFilter
              ? 'bg-gold text-black'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          )}
        >
          All
        </button>
        <button
          onClick={() => handleStatusFilter('pending')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            statusFilter === 'pending'
              ? 'bg-yellow-500 text-black'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          )}
        >
          Pending
        </button>
        <button
          onClick={() => handleStatusFilter('parsed')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            statusFilter === 'parsed'
              ? 'bg-purple-500 text-white'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          )}
        >
          Parsed
        </button>
        <button
          onClick={() => handleStatusFilter('verified')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            statusFilter === 'verified'
              ? 'bg-green-500 text-white'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          )}
        >
          Verified
        </button>
        <button
          onClick={() => handleStatusFilter('added_to_pl')}
          className={cn(
            'px-4 py-2 rounded-lg font-medium transition-colors',
            statusFilter === 'added_to_pl'
              ? 'bg-green-500 text-white'
              : 'bg-gray-900 text-gray-400 hover:text-white'
          )}
        >
          Added to P&L
        </button>
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm">
        {loading ? 'Loading...' : `${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}`}
      </p>

      {/* Receipts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No receipts found</h3>
          <p className="text-gray-400 mb-4">
            {statusFilter ? 'Try adjusting your filter' : 'Upload your first receipt'}
          </p>
          <Link
            href="/kts/inventory/receipts/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Upload Receipt
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <Link
              key={receipt.id}
              href={`/kts/inventory/receipts/${receipt.id}`}
              className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl hover:border-gold/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                  {receipt.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element -- User-uploaded receipt */
                    <img
                      src={receipt.imageUrl}
                      alt="Receipt"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Receipt className="h-6 w-6 text-gray-600" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
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
                  <p className="text-gray-400 text-sm">
                    {receipt.uploadedByName} • {receipt.uploadedAt.toDate().toLocaleDateString()}
                  </p>
                  {receipt.items.length > 0 && (
                    <p className="text-gray-500 text-xs">
                      {receipt.items.length} item{receipt.items.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                {receipt.total && (
                  <p className="text-white font-medium">
                    ${receipt.total.toFixed(2)}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  {receipt.status === 'error' && (
                    <AlertCircle className="h-5 w-5 text-red-400" />
                  )}
                  {receipt.status === 'verified' && (
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  )}
                  {receipt.status === 'added_to_pl' && (
                    <DollarSign className="h-5 w-5 text-green-400" />
                  )}
                  <Eye className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

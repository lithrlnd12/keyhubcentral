'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getAuth } from 'firebase/auth';
import {
  ArrowLeft,
  Receipt,
  CheckCircle,
  DollarSign,
  Loader2,
  AlertCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { getReceipt, updateReceiptStatus, verifyReceipt } from '@/lib/firebase/receipts';
import { Receipt as ReceiptType, getReceiptStatusLabel, getReceiptStatusColor } from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks';

export default function ReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const receiptId = params.id as string;

  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [reparsing, setReparsing] = useState(false);

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const data = await getReceipt(receiptId);
        if (data) {
          setReceipt(data);
        } else {
          setError('Receipt not found');
        }
      } catch (err) {
        console.error('Error fetching receipt:', err);
        setError('Failed to load receipt');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [receiptId]);

  const handleVerify = async () => {
    if (!receipt || !user) return;
    setVerifying(true);
    try {
      await verifyReceipt(receiptId, user.uid);
      setReceipt({ ...receipt, status: 'verified', verifiedBy: user.uid });
    } catch (err) {
      console.error('Verify error:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleReparse = async () => {
    if (!receipt) return;
    setReparsing(true);
    try {
      // Get auth token
      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Not authenticated');
      }
      const token = await currentUser.getIdToken();

      const response = await fetch('/api/receipts/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          receiptId: receipt.id,
          imageUrl: receipt.imageUrl,
        }),
      });

      if (response.ok) {
        // Refresh receipt data
        const data = await getReceipt(receiptId);
        if (data) setReceipt(data);
      }
    } catch (err) {
      console.error('Reparse error:', err);
    } finally {
      setReparsing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">{error || 'Receipt not found'}</h2>
        <Link
          href="/kts/inventory/receipts"
          className="text-gold hover:underline"
        >
          Back to Receipts
        </Link>
      </div>
    );
  }

  const isPdf = receipt.imageUrl?.toLowerCase().includes('.pdf');
  const parsedData = receipt.parsedData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/kts/inventory/receipts"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                {receipt.vendor || 'Receipt Details'}
              </h1>
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  getReceiptStatusColor(receipt.status)
                )}
              >
                {getReceiptStatusLabel(receipt.status)}
              </span>
            </div>
            <p className="text-gray-400">
              Uploaded by {receipt.uploadedByName} on{' '}
              {receipt.uploadedAt.toDate().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {receipt.status === 'error' && (
            <button
              onClick={handleReparse}
              disabled={reparsing}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {reparsing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Retry Parsing
            </button>
          )}
          {receipt.status === 'parsed' && (
            <button
              onClick={handleVerify}
              disabled={verifying}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {verifying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Verify Receipt
            </button>
          )}
          {receipt.status === 'verified' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors">
              <DollarSign className="h-4 w-4" />
              Add to P&L
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {receipt.status === 'error' && receipt.errorMessage && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Parsing Error</span>
          </div>
          <p className="text-gray-400 mt-2">{receipt.errorMessage}</p>
        </div>
      )}

      {/* Parsing Status */}
      {receipt.status === 'parsing' && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center">
          <Loader2 className="h-8 w-8 text-blue-400 mx-auto mb-3 animate-spin" />
          <p className="text-white font-medium">Processing Receipt...</p>
          <p className="text-gray-400 text-sm mt-1">
            AI is extracting items and totals. This may take a moment.
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Receipt Image/PDF */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <h2 className="text-lg font-medium text-white mb-4">Document</h2>
          {isPdf ? (
            <div className="bg-gray-900 rounded-lg p-8 text-center">
              <FileText className="h-16 w-16 text-red-400 mx-auto mb-3" />
              <p className="text-white font-medium">PDF Document</p>
              <a
                href={receipt.imageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold text-sm hover:underline mt-2 inline-block"
              >
                Open PDF
              </a>
            </div>
          ) : (
            <img
              src={receipt.imageUrl}
              alt="Receipt"
              className="w-full rounded-lg"
            />
          )}
        </div>

        {/* Parsed Data */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-medium text-white mb-4">Summary</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Vendor</span>
                <span className="text-white">{parsedData?.vendor || receipt.vendor || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="text-white">
                  {parsedData?.date ||
                    (receipt.purchaseDate ? receipt.purchaseDate.toDate().toLocaleDateString() : '-')}
                </span>
              </div>
              {receipt.locationName && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Location</span>
                  <span className="text-white">{receipt.locationName}</span>
                </div>
              )}
              <hr className="border-gray-700" />
              <div className="flex justify-between">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">
                  ${(parsedData?.subtotal ?? receipt.subtotal ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Tax</span>
                <span className="text-white">
                  ${(parsedData?.tax ?? receipt.tax ?? 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-medium">
                <span className="text-white">Total</span>
                <span className="text-gold">
                  ${(parsedData?.total ?? receipt.total ?? 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-medium text-white mb-4">
              Items ({parsedData?.items?.length || receipt.items?.length || 0})
            </h2>
            {(parsedData?.items?.length || receipt.items?.length) ? (
              <div className="space-y-3">
                {(parsedData?.items || receipt.items || []).map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-start p-3 bg-gray-900 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-white text-sm">{item.description}</p>
                      <p className="text-gray-500 text-xs">
                        {item.quantity} × ${item.unitPrice.toFixed(2)}
                      </p>
                    </div>
                    <p className="text-white font-medium">
                      ${item.total.toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Receipt className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No items parsed yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Raw Response (debug) */}
      {parsedData?.rawResponse && (
        <details className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <summary className="text-gray-400 cursor-pointer hover:text-white">
            Raw AI Response
          </summary>
          <pre className="mt-4 text-xs text-gray-500 overflow-x-auto whitespace-pre-wrap">
            {parsedData.rawResponse}
          </pre>
        </details>
      )}
    </div>
  );
}

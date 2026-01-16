'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Receipt, Loader2, Check, Eye, AlertCircle } from 'lucide-react';
import {
  useReceipts,
  useReceiptMutations,
  useContractorLocation,
  useAuth,
} from '@/lib/hooks';
import { getReceiptStatusLabel, getReceiptStatusColor } from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { ReceiptUploader } from '@/components/inventory';
import { cn } from '@/lib/utils';

export default function ContractorReceiptsPage() {
  const { user } = useAuth();
  const { location } = useContractorLocation(user?.uid || '');
  // Filter receipts by the logged-in contractor's ID
  const { receipts, loading } = useReceipts({
    contractorId: user?.uid,
    realtime: true,
  });
  const { uploadReceipt, parseReceipt, loading: uploading, error } = useReceiptMutations();

  const [showUpload, setShowUpload] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [uploadedId, setUploadedId] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    if (!user) return;

    try {
      const result = await uploadReceipt(
        file,
        user.uid,
        user.displayName || 'Unknown',
        location?.id,
        location?.name,
        user.uid // contractorId - the logged-in contractor owns this receipt
      );
      setUploadedId(result.receiptId);

      // Automatically start parsing
      setParsing(true);
      try {
        await parseReceipt(result.receiptId, result.imageUrl);
      } catch (parseError) {
        console.error('Parse error:', parseError);
      } finally {
        setParsing(false);
        setSuccess(true);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  const resetUpload = () => {
    setShowUpload(false);
    setSuccess(false);
    setUploadedId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/portal/inventory"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">My Receipts</h1>
            <p className="text-gray-400">Upload and track purchase receipts</p>
          </div>
        </div>
        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors"
          >
            <Receipt className="h-4 w-4" />
            Upload
          </button>
        )}
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
          {success && uploadedId ? (
            <div className="text-center py-4">
              <div className="p-3 bg-green-500/10 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-400" />
              </div>
              <p className="text-white font-medium mb-2">Receipt Uploaded!</p>
              <p className="text-gray-400 text-sm mb-4">
                Your receipt is being processed
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors text-sm"
                >
                  Upload Another
                </button>
                <button
                  onClick={resetUpload}
                  className="px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors text-sm"
                >
                  Done
                </button>
              </div>
            </div>
          ) : parsing ? (
            <div className="text-center py-8">
              <Loader2 className="h-10 w-10 text-gold mx-auto mb-4 animate-spin" />
              <p className="text-white font-medium mb-1">Processing...</p>
              <p className="text-gray-400 text-sm">
                AI is extracting receipt data
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-medium">Upload Receipt</h3>
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-gray-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
              {error && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm mb-4">
                  {error}
                </div>
              )}
              <ReceiptUploader onUpload={handleUpload} loading={uploading} />
            </>
          )}
        </div>
      )}

      {/* Receipts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : receipts.length === 0 ? (
        <div className="text-center py-12">
          <Receipt className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No receipts yet</h3>
          <p className="text-gray-400 mb-4">
            Upload a receipt to get started
          </p>
          {!showUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors"
            >
              <Receipt className="h-4 w-4" />
              Upload Receipt
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {receipts.map((receipt) => (
            <div
              key={receipt.id}
              className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-900 rounded-lg overflow-hidden flex-shrink-0">
                  {receipt.imageUrl ? (
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
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-white font-medium">
                      {receipt.vendor || 'Processing...'}
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
                  <p className="text-gray-500 text-sm">
                    {receipt.uploadedAt.toDate().toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {receipt.total && (
                  <p className="text-white font-medium">
                    ${receipt.total.toFixed(2)}
                  </p>
                )}
                {receipt.status === 'error' && (
                  <AlertCircle className="h-5 w-5 text-red-400" />
                )}
                {receipt.status === 'verified' && (
                  <Check className="h-5 w-5 text-green-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

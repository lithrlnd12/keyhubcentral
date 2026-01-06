'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Check } from 'lucide-react';
import { useReceiptMutations, useInventoryLocations, useAuth } from '@/lib/hooks';
import { ReceiptUploader } from '@/components/inventory';

export default function NewReceiptPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { locations } = useInventoryLocations({ realtime: true });
  const { uploadReceipt, parseReceipt, loading, error } = useReceiptMutations();

  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [uploadedReceipt, setUploadedReceipt] = useState<{
    id: string;
    imageUrl: string;
  } | null>(null);
  const [parsing, setParsing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleUpload = async (file: File) => {
    if (!user) return;

    const location = locations.find((l) => l.id === selectedLocation);

    try {
      const result = await uploadReceipt(
        file,
        user.uid,
        user.displayName || 'Unknown',
        selectedLocation || undefined,
        location?.name
      );
      setUploadedReceipt({ id: result.receiptId, imageUrl: result.imageUrl });

      // Automatically start parsing
      setParsing(true);
      try {
        await parseReceipt(result.receiptId, result.imageUrl);
        setSuccess(true);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        // Still redirect to the receipt page even if parsing fails
        setSuccess(true);
      } finally {
        setParsing(false);
      }
    } catch (err) {
      console.error('Upload error:', err);
    }
  };

  if (success && uploadedReceipt) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="p-4 bg-green-500/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Receipt Uploaded!</h2>
        <p className="text-gray-400 mb-6">
          Your receipt has been processed. Review the parsed data.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setUploadedReceipt(null);
              setSuccess(false);
            }}
            className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Upload Another
          </button>
          <Link
            href={`/kts/inventory/receipts/${uploadedReceipt.id}`}
            className="px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors"
          >
            View Receipt
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/kts/inventory/receipts"
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Upload Receipt</h1>
          <p className="text-gray-400">AI will automatically extract items and totals</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Location Selection */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Location (optional)
        </label>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
        >
          <option value="">No location selected</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <p className="text-gray-500 text-sm mt-2">
          Select where these items were purchased for
        </p>
      </div>

      {/* Upload Area */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        {parsing ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 text-gold mx-auto mb-4 animate-spin" />
            <p className="text-white font-medium mb-2">Processing Receipt...</p>
            <p className="text-gray-400 text-sm">
              AI is extracting items and totals. This may take a moment.
            </p>
          </div>
        ) : (
          <ReceiptUploader onUpload={handleUpload} loading={loading} />
        )}
      </div>

      {/* Info */}
      <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
        <h3 className="text-purple-400 font-medium mb-2">How it works</h3>
        <ul className="text-gray-400 text-sm space-y-1">
          <li>1. Upload a photo of your receipt</li>
          <li>2. AI automatically extracts vendor, items, and totals</li>
          <li>3. Review and verify the extracted data</li>
          <li>4. Link items to inventory and add to P&L</li>
        </ul>
      </div>
    </div>
  );
}

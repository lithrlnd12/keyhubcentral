'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Minus, Plus, Save, Check, Truck } from 'lucide-react';
import {
  useInventoryItems,
  useContractorLocation,
  useInventoryStock,
  useSubmitCount,
  useAuth,
} from '@/lib/hooks';
import { InventoryCountItem } from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';

export default function ContractorCountPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { location, loading: locationLoading } = useContractorLocation(
    user?.uid || ''
  );
  const { items, loading: itemsLoading } = useInventoryItems({ realtime: true });
  const { submitCount, loading: submitting, error } = useSubmitCount();

  const [counts, setCounts] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Get current stock for truck
  const { stock } = useInventoryStock({
    locationId: location?.id,
    realtime: true,
  });

  // Initialize counts from current stock
  useEffect(() => {
    if (stock.length > 0) {
      const initialCounts: Record<string, number> = {};
      stock.forEach((s) => {
        initialCounts[s.itemId] = s.quantity;
      });
      setCounts(initialCounts);
    } else if (items.length > 0 && location) {
      const initialCounts: Record<string, number> = {};
      items.forEach((item) => {
        initialCounts[item.id] = 0;
      });
      setCounts(initialCounts);
    }
  }, [stock, items, location]);

  const handleCountChange = (itemId: string, change: number) => {
    setCounts((prev) => ({
      ...prev,
      [itemId]: Math.max(0, (prev[itemId] || 0) + change),
    }));
  };

  const handleDirectInput = (itemId: string, value: string) => {
    const num = parseInt(value) || 0;
    setCounts((prev) => ({
      ...prev,
      [itemId]: Math.max(0, num),
    }));
  };

  const handleSubmit = async () => {
    if (!location || !user) return;

    const countItems: InventoryCountItem[] = items.map((item) => {
      const previousQuantity = stock.find((s) => s.itemId === item.id)?.quantity || 0;
      const newQuantity = counts[item.id] || 0;

      return {
        itemId: item.id,
        itemName: item.name,
        previousQuantity,
        newQuantity,
        parLevel: item.parLevel,
        variance: newQuantity - previousQuantity,
      };
    });

    try {
      await submitCount(
        location.id,
        location.name,
        user.uid,
        user.displayName || 'Unknown',
        countItems,
        notes || undefined
      );
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit count:', err);
    }
  };

  if (locationLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="text-center py-12">
        <Truck className="h-12 w-12 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">
          No Truck Location
        </h2>
        <p className="text-gray-400 mb-4">
          Your truck inventory location hasn&apos;t been set up yet.
        </p>
        <Link
          href="/portal/inventory"
          className="text-gold hover:underline"
        >
          Go back
        </Link>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="p-4 bg-green-500/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <Check className="h-8 w-8 text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Count Submitted!</h2>
        <p className="text-gray-400 mb-6">
          Your truck inventory has been updated
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setCounts({});
              setNotes('');
              setSubmitted(false);
            }}
            className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
          >
            Count Again
          </button>
          <Link
            href="/portal/inventory"
            className="px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors"
          >
            Back to Inventory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/portal/inventory"
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">Count Inventory</h1>
          <p className="text-gray-400">{location.name}</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
        >
          {submitting ? (
            <>
              <Spinner size="sm" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Submit
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Notes (optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Add any notes..."
          className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
        />
      </div>

      {/* Items List */}
      {itemsLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No items to count</h3>
          <p className="text-gray-400">No inventory items have been added yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const currentStock = stock.find((s) => s.itemId === item.id);
            const count = counts[item.id] || 0;
            const belowPar = count < item.parLevel;

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center justify-between p-4 bg-brand-charcoal border rounded-xl',
                  belowPar ? 'border-red-500/30' : 'border-gray-800'
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{item.name}</p>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">Par: {item.parLevel}</span>
                    {belowPar && (
                      <span className="text-red-400">Low</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCountChange(item.id, -1)}
                    className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <input
                    type="number"
                    min="0"
                    value={count}
                    onChange={(e) => handleDirectInput(item.id, e.target.value)}
                    className={cn(
                      'w-16 px-2 py-2 text-center text-lg bg-gray-900 border rounded-lg text-white focus:outline-none focus:border-gold',
                      belowPar ? 'border-red-500/50' : 'border-gray-800'
                    )}
                  />
                  <button
                    onClick={() => handleCountChange(item.id, 1)}
                    className="p-3 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

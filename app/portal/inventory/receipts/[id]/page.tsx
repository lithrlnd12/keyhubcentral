'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Receipt,
  CheckCircle,
  Loader2,
  AlertCircle,
  Package,
  Briefcase,
  X,
} from 'lucide-react';
import {
  getReceipt,
  linkReceiptItemToInventory,
  markReceiptAddedToInventory,
  updateReceiptJob,
  updateReceiptLocation,
} from '@/lib/firebase/receipts';
import { addStockFromReceipt } from '@/lib/firebase/inventoryStock';
import { createInventoryItem } from '@/lib/firebase/inventory';
import {
  Receipt as ReceiptType,
  ReceiptItem,
  getReceiptStatusLabel,
  getReceiptStatusColor,
  InventoryItem,
  InventoryCategory,
} from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import {
  useAuth,
  useInventoryItems,
  useInventoryLocations,
  useContractorJobs,
} from '@/lib/hooks';

interface ItemLinkState {
  itemIndex: number;
  inventoryItemId?: string;
  inventoryItemName?: string;
  category?: InventoryCategory;
  isNew?: boolean;
}

export default function PortalReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const receiptId = params.id as string;

  const [receipt, setReceipt] = useState<ReceiptType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [itemLinks, setItemLinks] = useState<Map<number, ItemLinkState>>(new Map());
  const [inventoryError, setInventoryError] = useState<string | null>(null);
  const [inventorySuccess, setInventorySuccess] = useState(false);

  const { items: inventoryItems } = useInventoryItems({ realtime: true, contractorId: user?.uid });
  const { locations } = useInventoryLocations({ realtime: true });
  const { activeJobs } = useContractorJobs({
    contractorId: user?.uid || '',
    realtime: true,
  });

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const data = await getReceipt(receiptId);
        if (data) {
          // Security: only show receipts owned by this contractor
          if (data.contractorId !== user?.uid) {
            router.push('/portal/inventory/receipts');
            return;
          }
          setReceipt(data);
          // Initialize item links from existing links or AI match suggestions
          const links = new Map<number, ItemLinkState>();
          data.items?.forEach((item: ReceiptItem, index: number) => {
            if (item.inventoryItemId) {
              links.set(index, {
                itemIndex: index,
                inventoryItemId: item.inventoryItemId,
                inventoryItemName: item.inventoryItemName,
                category: item.category,
              });
            }
          });
          // Apply AI match suggestions for items not already linked
          if (data.matchSuggestions) {
            for (const suggestion of data.matchSuggestions) {
              if (!links.has(suggestion.parsedIndex) && suggestion.matchedItemId) {
                links.set(suggestion.parsedIndex, {
                  itemIndex: suggestion.parsedIndex,
                  inventoryItemId: suggestion.matchedItemId,
                  inventoryItemName: suggestion.matchedItemName,
                });
              }
            }
          }
          setItemLinks(links);
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

    if (user?.uid) fetchReceipt();
  }, [receiptId, user?.uid, router]);

  const writeSelectedItemsToInventory = async () => {
    if (!receipt) return;
    const items = receipt.parsedData?.items || receipt.items || [];

    for (const idx of Array.from(selectedItems)) {
      const item = items[idx];
      if (!item) continue;

      const link = itemLinks.get(idx);
      let inventoryItemId = link?.inventoryItemId;

      // Create new inventory item if needed
      if (!inventoryItemId && link?.isNew) {
        inventoryItemId = await createInventoryItem({
          name: item.description,
          category: link.category || 'material',
          unitOfMeasure: 'each',
          parLevel: 0,
          createdBy: user!.uid,
          contractorId: user!.uid,
        });
        await linkReceiptItemToInventory(
          receipt.id,
          idx,
          inventoryItemId,
          item.description
        );
      } else if (inventoryItemId) {
        await linkReceiptItemToInventory(
          receipt.id,
          idx,
          inventoryItemId,
          link?.inventoryItemName || item.description
        );
      }

      // Add stock at the selected location
      if (inventoryItemId && receipt.locationId) {
        const invItem = inventoryItems.find((i) => i.id === inventoryItemId);
        await addStockFromReceipt(
          inventoryItemId,
          receipt.locationId,
          item.quantity || 1,
          invItem?.name || item.description,
          receipt.locationName || '',
          invItem?.parLevel || 0,
          user!.uid,
          user!.displayName || 'Unknown'
        );
      }
    }
  };

  const handleAddToInventory = async () => {
    if (!receipt || !user) return;
    if (!receipt.locationId) {
      setInventoryError('Select a stock location before adding to inventory.');
      return;
    }
    if (selectedItems.size === 0) {
      setInventoryError('No items selected.');
      return;
    }
    setInventoryError(null);
    setInventorySuccess(false);
    setAdding(true);
    try {
      await writeSelectedItemsToInventory();
      await markReceiptAddedToInventory(receipt.id);
      setReceipt({ ...receipt, addedToInventory: true });
      setInventorySuccess(true);
    } catch (err) {
      console.error('Add to inventory error:', err);
      setInventoryError('Something went wrong. Try again.');
    } finally {
      setAdding(false);
    }
  };

  const handleLinkItem = (itemIndex: number, inventoryItem: InventoryItem) => {
    setItemLinks((prev) => {
      const newLinks = new Map(prev);
      newLinks.set(itemIndex, {
        itemIndex,
        inventoryItemId: inventoryItem.id,
        inventoryItemName: inventoryItem.name,
        category: inventoryItem.category,
      });
      return newLinks;
    });
  };

  const handleNewItem = (itemIndex: number, category: InventoryCategory) => {
    setItemLinks((prev) => {
      const newLinks = new Map(prev);
      newLinks.set(itemIndex, {
        itemIndex,
        isNew: true,
        category,
      });
      return newLinks;
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-white">{error || 'Receipt not found'}</p>
        <Link href="/portal/inventory/receipts" className="text-gold hover:underline mt-2 inline-block">
          Back to receipts
        </Link>
      </div>
    );
  }

  const items = receipt.parsedData?.items || receipt.items || [];
  const canAddToInventory = ['parsed', 'verified', 'added_to_pl'].includes(receipt.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/portal/inventory/receipts"
            className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                {receipt.vendor || 'Receipt'}
              </h1>
              <span className={cn('text-xs px-2 py-1 rounded-full', getReceiptStatusColor(receipt.status))}>
                {getReceiptStatusLabel(receipt.status)}
              </span>
            </div>
            <p className="text-gray-400">
              Uploaded on {receipt.uploadedAt.toDate().toLocaleDateString()}
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {canAddToInventory && (
            receipt.addedToInventory ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium">
                <CheckCircle className="h-4 w-4" />
                Added to Inventory
              </div>
            ) : (
              <button
                onClick={handleAddToInventory}
                disabled={adding || selectedItems.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Package className="h-4 w-4" />
                )}
                Add {selectedItems.size} to Inventory
              </button>
            )
          )}
        </div>
      </div>

      {/* Receipt Image */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
        <div className="max-h-96 overflow-auto rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={receipt.imageUrl}
            alt="Receipt"
            className="w-full object-contain rounded-lg"
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
        <h2 className="text-lg font-medium text-white mb-4">Summary</h2>
        <div className="space-y-3">
          {receipt.vendor && (
            <div className="flex justify-between">
              <span className="text-gray-400">Vendor</span>
              <span className="text-white">{receipt.vendor}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-400">Total</span>
            <span className="text-gold font-medium">
              ${(receipt.parsedData?.total ?? receipt.total ?? 0).toFixed(2)}
            </span>
          </div>

          {/* Stock Location */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Stock Location</span>
            {locations.length > 0 ? (
              <select
                value={receipt.locationId || ''}
                onChange={async (e) => {
                  const loc = locations.find((l) => l.id === e.target.value);
                  if (loc) {
                    await updateReceiptLocation(receiptId, loc.id, loc.name);
                    setReceipt({ ...receipt, locationId: loc.id, locationName: loc.name });
                  }
                }}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <option value="">Select location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            ) : (
              <Link
                href="/portal/inventory"
                className="text-sm text-gold hover:underline"
              >
                Set up a location first
              </Link>
            )}
          </div>

          {/* Job Link */}
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Linked Job</span>
            <select
              value={receipt.jobId || ''}
              onChange={async (e) => {
                const jobId = e.target.value;
                await updateReceiptJob(receiptId, jobId);
                setReceipt({ ...receipt, jobId: jobId || undefined });
              }}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
            >
              <option value="">No job linked</option>
              {activeJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.jobNumber ? `#${job.jobNumber} — ` : ''}{job.customer?.name || 'Unnamed'}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Feedback Banners */}
      {inventoryError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center justify-between">
          <span className="text-red-400 text-sm">{inventoryError}</span>
          <button onClick={() => setInventoryError(null)} className="text-gray-500 hover:text-white ml-3">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {inventorySuccess && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-3 flex items-center justify-between">
          <span className="text-green-400 text-sm">Items added to inventory.</span>
          <button onClick={() => setInventorySuccess(false)} className="text-gray-500 hover:text-white ml-3">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Line Items */}
      {items.length > 0 && (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Items ({items.length})</h2>
            {canAddToInventory && !receipt.addedToInventory && items.length > 0 && (
              <button
                onClick={() => {
                  if (selectedItems.size === items.length) {
                    setSelectedItems(new Set());
                  } else {
                    setSelectedItems(new Set(items.map((_, i) => i)));
                  }
                }}
                className="text-xs text-gray-400 hover:text-white transition-colors"
              >
                {selectedItems.size === items.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          <div className="space-y-2">
            {items.map((item, index) => {
              const linked = itemLinks.get(index);
              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                    selectedItems.has(index)
                      ? 'border-gold/50 bg-gold/5'
                      : 'border-gray-800 bg-gray-900/50'
                  )}
                >
                  {canAddToInventory && !receipt.addedToInventory && (
                    <input
                      type="checkbox"
                      checked={selectedItems.has(index)}
                      onChange={(e) => {
                        setSelectedItems((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) {
                            next.add(index);
                            if (!linked) {
                              handleNewItem(index, 'material');
                            }
                          } else {
                            next.delete(index);
                          }
                          return next;
                        });
                      }}
                      className="rounded border-gray-600 text-gold focus:ring-gold"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{item.description}</p>
                    {linked && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {linked.isNew ? 'New item' : `Linked: ${linked.inventoryItemName}`} ({linked.category})
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-white text-sm">
                      ${((item as ReceiptItem).total ?? ((item as ReceiptItem).unitPrice ?? 0) * ((item as ReceiptItem).quantity ?? 1)).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      x{(item as ReceiptItem).quantity ?? 1}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

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
  Package,
  Wrench,
  Link as LinkIcon,
  Plus,
  X,
} from 'lucide-react';
import { getReceipt, verifyReceipt, linkReceiptItemToInventory } from '@/lib/firebase/receipts';
import { addStockFromReceipt } from '@/lib/firebase/inventoryStock';
import { Receipt as ReceiptType, ReceiptItem, getReceiptStatusLabel, getReceiptStatusColor, InventoryItem, InventoryCategory } from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { useAuth, useInventoryItems } from '@/lib/hooks';

interface ItemLinkState {
  itemIndex: number;
  inventoryItemId?: string;
  inventoryItemName?: string;
  category?: InventoryCategory;
  isNew?: boolean;
}

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
  const [linkingItem, setLinkingItem] = useState<number | null>(null);
  const [itemLinks, setItemLinks] = useState<Map<number, ItemLinkState>>(new Map());

  // Fetch inventory items for linking
  const { items: inventoryItems } = useInventoryItems({ realtime: true });

  useEffect(() => {
    const fetchReceipt = async () => {
      try {
        const data = await getReceipt(receiptId);
        if (data) {
          setReceipt(data);
          // Initialize item links from existing data or AI-suggested categories
          const links = new Map<number, ItemLinkState>();
          data.items?.forEach((item, index) => {
            if (item.inventoryItemId) {
              links.set(index, {
                itemIndex: index,
                inventoryItemId: item.inventoryItemId,
                inventoryItemName: item.inventoryItemName,
                category: item.category,
              });
            } else if (item.category) {
              // Pre-fill with AI-suggested category
              links.set(index, {
                itemIndex: index,
                category: item.category,
                isNew: true,
              });
            }
          });
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

    fetchReceipt();
  }, [receiptId]);

  const handleVerify = async () => {
    if (!receipt || !user) return;
    setVerifying(true);
    try {
      const receiptItems = receipt.parsedData?.items || receipt.items || [];
      const linkEntries = Array.from(itemLinks.entries());

      // Save all item links and update inventory stock
      for (const [index, link] of linkEntries) {
        if (link.inventoryItemId && link.inventoryItemName) {
          // Link receipt item to inventory
          await linkReceiptItemToInventory(
            receiptId,
            index,
            link.inventoryItemId,
            link.inventoryItemName
          );

          // If receipt has a location, add stock
          if (receipt.locationId && receipt.locationName) {
            const receiptItem = receiptItems[index];
            const invItem = inventoryItems.find(i => i.id === link.inventoryItemId);

            if (receiptItem && invItem) {
              await addStockFromReceipt(
                link.inventoryItemId,
                receipt.locationId,
                receiptItem.quantity,
                link.inventoryItemName,
                receipt.locationName,
                invItem.parLevel,
                user.uid,
                user.displayName || 'Unknown'
              );
            }
          }
        }
      }

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
        const data = await getReceipt(receiptId);
        if (data) setReceipt(data);
      }
    } catch (err) {
      console.error('Reparse error:', err);
    } finally {
      setReparsing(false);
    }
  };

  const handleLinkItem = (itemIndex: number, inventoryItem: InventoryItem) => {
    setItemLinks(prev => {
      const newLinks = new Map(prev);
      newLinks.set(itemIndex, {
        itemIndex,
        inventoryItemId: inventoryItem.id,
        inventoryItemName: inventoryItem.name,
        category: inventoryItem.category,
      });
      return newLinks;
    });
    setLinkingItem(null);
  };

  const handleSetCategory = (itemIndex: number, category: InventoryCategory) => {
    setItemLinks(prev => {
      const newLinks = new Map(prev);
      const existing = newLinks.get(itemIndex);
      newLinks.set(itemIndex, {
        ...existing,
        itemIndex,
        category,
        isNew: true,
      });
      return newLinks;
    });
  };

  const handleUnlinkItem = (itemIndex: number) => {
    setItemLinks(prev => {
      const newLinks = new Map(prev);
      newLinks.delete(itemIndex);
      return newLinks;
    });
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
  const items = parsedData?.items || receipt.items || [];
  const canEdit = receipt.status === 'parsed';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
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
              Verify & Save
            </button>
          )}
          {receipt.status === 'verified' && (
            <button className="flex items-center gap-2 px-4 py-2 bg-gold text-brand-black rounded-lg font-medium hover:bg-gold/90 transition-colors">
              <DollarSign className="h-4 w-4" />
              Add to P&L
            </button>
          )}
        </div>
      </div>

      {/* Instructions for parsed status */}
      {receipt.status === 'parsed' && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
          <h3 className="text-purple-400 font-medium mb-2">Review & Categorize Items</h3>
          <p className="text-gray-400 text-sm">
            Link each item to existing inventory or assign a category (Material/Tool).
            Click &quot;Verify &amp; Save&quot; when done.
          </p>
        </div>
      )}

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

          {/* Line Items with Inventory Linking */}
          <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
            <h2 className="text-lg font-medium text-white mb-4">
              Items ({items.length})
            </h2>
            {items.length > 0 ? (
              <div className="space-y-3">
                {items.map((item, index) => {
                  const link = itemLinks.get(index);
                  const existingLink = receipt.items?.[index];

                  return (
                    <div
                      key={index}
                      className="p-3 bg-gray-900 rounded-lg space-y-2"
                    >
                      <div className="flex justify-between items-start">
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

                      {/* Inventory Link/Category */}
                      {canEdit ? (
                        <div className="pt-2 border-t border-gray-800">
                          {linkingItem === index ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-400 text-xs">Link to inventory:</span>
                                <button
                                  onClick={() => setLinkingItem(null)}
                                  className="text-gray-500 hover:text-white"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                              <div className="max-h-40 overflow-y-auto space-y-1">
                                {inventoryItems.map((invItem) => (
                                  <button
                                    key={invItem.id}
                                    onClick={() => handleLinkItem(index, invItem)}
                                    className="w-full flex items-center gap-2 px-2 py-1.5 text-left text-sm rounded hover:bg-gray-800 transition-colors"
                                  >
                                    {invItem.category === 'material' ? (
                                      <Package className="h-4 w-4 text-gold" />
                                    ) : (
                                      <Wrench className="h-4 w-4 text-blue-400" />
                                    )}
                                    <span className="text-white">{invItem.name}</span>
                                    <span className="text-gray-500 text-xs ml-auto capitalize">
                                      {invItem.category}
                                    </span>
                                  </button>
                                ))}
                                {inventoryItems.length === 0 && (
                                  <p className="text-gray-500 text-sm py-2 text-center">
                                    No inventory items yet
                                  </p>
                                )}
                              </div>
                              <div className="flex gap-2 pt-2 border-t border-gray-800">
                                <span className="text-gray-400 text-xs">Or set as new:</span>
                                <button
                                  onClick={() => {
                                    handleSetCategory(index, 'material');
                                    setLinkingItem(null);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-gold/20 text-gold rounded hover:bg-gold/30"
                                >
                                  <Package className="h-3 w-3" />
                                  Material
                                </button>
                                <button
                                  onClick={() => {
                                    handleSetCategory(index, 'tool');
                                    setLinkingItem(null);
                                  }}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                                >
                                  <Wrench className="h-3 w-3" />
                                  Tool
                                </button>
                              </div>
                            </div>
                          ) : link ? (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {link.category === 'material' ? (
                                  <Package className="h-4 w-4 text-gold" />
                                ) : link.category === 'tool' ? (
                                  <Wrench className="h-4 w-4 text-blue-400" />
                                ) : (
                                  <Package className="h-4 w-4 text-gray-400" />
                                )}
                                <span className="text-sm text-white">
                                  {link.inventoryItemName || (link.isNew ? `${link.category === 'material' ? 'Material' : 'Tool'}` : '')}
                                </span>
                                {link.isNew && !link.inventoryItemId && (
                                  <span className="text-xs px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                                    AI Suggested
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleUnlinkItem(index)}
                                className="text-gray-500 hover:text-red-400 text-xs"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setLinkingItem(index)}
                              className="flex items-center gap-2 text-gray-400 hover:text-white text-sm"
                            >
                              <LinkIcon className="h-4 w-4" />
                              Link to inventory
                            </button>
                          )}
                        </div>
                      ) : (existingLink?.inventoryItemId || link) && (
                        <div className="pt-2 border-t border-gray-800">
                          <div className="flex items-center gap-2 text-sm">
                            <LinkIcon className="h-4 w-4 text-green-400" />
                            <span className="text-gray-400">Linked to:</span>
                            <span className="text-white">
                              {existingLink?.inventoryItemName || link?.inventoryItemName}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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

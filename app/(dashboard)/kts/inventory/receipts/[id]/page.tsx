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
import { getReceipt, verifyReceipt, linkReceiptItemToInventory, updateReceiptLocation, updateReceiptVendor, addReceiptToPL } from '@/lib/firebase/receipts';
import { addStockFromReceipt } from '@/lib/firebase/inventoryStock';
import { createInventoryItem } from '@/lib/firebase/inventory';
import { createExpenseFromReceipt } from '@/lib/firebase/expenses';
import { Receipt as ReceiptType, ReceiptItem, getReceiptStatusLabel, getReceiptStatusColor, InventoryItem, InventoryCategory } from '@/types/inventory';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils';
import { useAuth, useInventoryItems, useInventoryLocations } from '@/lib/hooks';

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
  const [addingToPL, setAddingToPL] = useState(false);
  const [linkingItem, setLinkingItem] = useState<number | null>(null);
  const [itemLinks, setItemLinks] = useState<Map<number, ItemLinkState>>(new Map());
  const [editingVendor, setEditingVendor] = useState(false);
  const [vendorInput, setVendorInput] = useState('');
  const [customLocation, setCustomLocation] = useState('');

  // Fetch inventory items for linking
  const { items: inventoryItems } = useInventoryItems({ realtime: true });

  // Fetch locations for stock assignment
  const { locations } = useInventoryLocations({ realtime: true });

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
        const receiptItem = receiptItems[index];
        if (!receiptItem) continue;

        let inventoryItemId = link.inventoryItemId;
        let inventoryItemName = link.inventoryItemName;
        let parLevel = 0;

        // If this is a new item (has category but no inventory link), create it
        if (link.isNew && link.category && !link.inventoryItemId) {
          const newItemId = await createInventoryItem({
            name: receiptItem.description,
            category: link.category,
            unitOfMeasure: 'each',
            parLevel: receiptItem.quantity, // Set par level to initial quantity
            cost: receiptItem.unitPrice || undefined,
            createdBy: user.uid,
          });

          inventoryItemId = newItemId;
          inventoryItemName = receiptItem.description;
          parLevel = receiptItem.quantity;
        } else if (link.inventoryItemId) {
          // Get par level from existing inventory item
          const invItem = inventoryItems.find(i => i.id === link.inventoryItemId);
          parLevel = invItem?.parLevel || 0;
        }

        // Link receipt item to inventory if we have an ID
        if (inventoryItemId && inventoryItemName) {
          await linkReceiptItemToInventory(
            receiptId,
            index,
            inventoryItemId,
            inventoryItemName
          );

          // If receipt has a location, add stock
          if (receipt.locationId && receipt.locationName) {
            await addStockFromReceipt(
              inventoryItemId,
              receipt.locationId,
              receiptItem.quantity,
              inventoryItemName,
              receipt.locationName,
              parLevel,
              user.uid,
              user.displayName || 'Unknown'
            );
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

  const handleAddToPL = async () => {
    if (!receipt || !user) return;
    setAddingToPL(true);
    try {
      // Create expense from receipt
      const expenseDate = receipt.purchaseDate
        ? receipt.purchaseDate.toDate()
        : receipt.uploadedAt.toDate();

      const expenseId = await createExpenseFromReceipt(
        receipt.id,
        'kts', // Inventory expenses go to KTS
        'inventory',
        `Receipt from ${receipt.vendor || 'Unknown Vendor'}`,
        receipt.vendor,
        receipt.total || 0,
        expenseDate,
        receipt.imageUrl,
        user.uid,
        user.displayName || 'Unknown'
      );

      // Update receipt status to added_to_pl
      await addReceiptToPL(receipt.id, expenseId);
      setReceipt({ ...receipt, status: 'added_to_pl', plExpenseId: expenseId });
    } catch (err) {
      console.error('Add to P&L error:', err);
    } finally {
      setAddingToPL(false);
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
            <button
              onClick={handleAddToPL}
              disabled={addingToPL}
              className="flex items-center gap-2 px-4 py-2 bg-gold text-brand-black rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
            >
              {addingToPL ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <DollarSign className="h-4 w-4" />
              )}
              Add to P&L
            </button>
          )}
          {receipt.status === 'added_to_pl' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg font-medium">
              <CheckCircle className="h-4 w-4" />
              Added to P&L
            </div>
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

      {/* Warning if no location selected */}
      {receipt.status === 'parsed' && !receipt.locationId && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <h3 className="text-yellow-400 font-medium mb-2">No Location Selected</h3>
          <p className="text-gray-400 text-sm">
            Select a location in the Summary section to add items to inventory stock.
            Without a location, items will be created but stock levels won&apos;t be tracked.
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
              {/* Vendor - Editable */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Vendor</span>
                {canEdit && editingVendor ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={vendorInput}
                      onChange={(e) => setVendorInput(e.target.value)}
                      placeholder="Enter vendor name"
                      className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold w-40"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        if (vendorInput.trim()) {
                          await updateReceiptVendor(receiptId, vendorInput.trim());
                          setReceipt({ ...receipt, vendor: vendorInput.trim() });
                        }
                        setEditingVendor(false);
                      }}
                      className="text-green-400 hover:text-green-300"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setEditingVendor(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setVendorInput(parsedData?.vendor || receipt.vendor || '');
                      setEditingVendor(true);
                    }}
                    className={cn(
                      "text-white hover:text-gold transition-colors",
                      canEdit && "cursor-pointer"
                    )}
                    disabled={!canEdit}
                  >
                    {parsedData?.vendor || receipt.vendor || (canEdit ? 'Click to add...' : '-')}
                  </button>
                )}
              </div>
              {/* Store Location (from AI parsing) */}
              {parsedData?.storeLocation && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Store Address</span>
                  <span className="text-white text-sm">{parsedData.storeLocation}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-400">Date</span>
                <span className="text-white">
                  {parsedData?.date ||
                    (receipt.purchaseDate ? receipt.purchaseDate.toDate().toLocaleDateString() : '-')}
                </span>
              </div>
              {/* Inventory Location - Dropdown + Custom Option */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Stock Location</span>
                {canEdit ? (
                  <div className="flex flex-col items-end gap-2">
                    <select
                      value={receipt.locationId || 'custom'}
                      onChange={async (e) => {
                        if (e.target.value === 'custom') {
                          // Clear location, user will type custom
                          setCustomLocation('');
                          setReceipt({ ...receipt, locationId: undefined, locationName: undefined });
                        } else {
                          const loc = locations.find(l => l.id === e.target.value);
                          if (loc) {
                            await updateReceiptLocation(receiptId, loc.id, loc.name);
                            setReceipt({ ...receipt, locationId: loc.id, locationName: loc.name });
                            setCustomLocation('');
                          }
                        }
                      }}
                      className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold"
                    >
                      <option value="">Select location...</option>
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                      <option value="custom">+ Custom location...</option>
                    </select>
                    {(!receipt.locationId || customLocation) && (
                      <input
                        type="text"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        onBlur={async () => {
                          if (customLocation.trim()) {
                            // Save as custom location name without an ID
                            await updateReceiptLocation(receiptId, 'custom', customLocation.trim());
                            setReceipt({ ...receipt, locationId: 'custom', locationName: customLocation.trim() });
                          }
                        }}
                        placeholder="e.g., My Truck, Job Site #123"
                        className="px-3 py-1 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-gold w-48"
                      />
                    )}
                  </div>
                ) : (
                  <span className="text-white">{receipt.locationName || '-'}</span>
                )}
              </div>
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

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Wrench,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { useInventoryItem, useInventoryMutations } from '@/lib/hooks/useInventory';
import { useInventoryStock } from '@/lib/hooks/useInventoryStock';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { StockLevelBadge } from '@/components/inventory';
import {
  getCategoryLabel,
  getVarianceColor,
  getVarianceDisplay,
} from '@/types/inventory';
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

export default function InventoryItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { user } = useAuth();
  const { item, loading: itemLoading, error: itemError } = useInventoryItem(id, { realtime: true });
  const { stock, loading: stockLoading } = useInventoryStock({ itemId: id, realtime: true });
  const { deleteItem, loading: deleting } = useInventoryMutations();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const canEdit = user?.role && ['owner', 'admin'].includes(user.role);
  const loading = itemLoading || stockLoading;

  const handleDelete = async () => {
    try {
      await deleteItem(id);
      router.push('/kts/inventory/items');
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  // Calculate total stock across all locations
  const totalStock = stock.reduce((sum, s) => sum + s.quantity, 0);
  const totalParLevel = item?.parLevel || 0;
  const overallVariance = totalStock - (stock.length * totalParLevel);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (itemError) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{itemError}</p>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Inventory item not found</p>
        <Link
          href="/kts/inventory/items"
          className="mt-4 inline-flex items-center gap-2 text-brand-gold hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Items
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/kts/inventory/items"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Items
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {item.category === 'material' ? (
                <Package className="h-8 w-8 text-brand-gold" />
              ) : (
                <Wrench className="h-8 w-8 text-blue-400" />
              )}
              <h1 className="text-2xl font-bold text-white">{item.name}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium',
                  item.category === 'material'
                    ? 'bg-brand-gold/20 text-brand-gold'
                    : 'bg-blue-500/20 text-blue-400'
                )}
              >
                {getCategoryLabel(item.category)}
              </span>
              {item.sku && (
                <span className="px-2.5 py-1 rounded bg-gray-800 text-gray-400 text-xs">
                  SKU: {item.sku}
                </span>
              )}
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              <Link
                href={`/kts/inventory/items/${id}/edit`}
                className="flex items-center gap-2 px-4 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 hover:bg-red-500/30 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Item Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Item Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {item.description && (
              <div className="sm:col-span-2 lg:col-span-3">
                <p className="text-sm text-gray-400">Description</p>
                <p className="text-white">{item.description}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-gray-400">Unit of Measure</p>
              <p className="text-white capitalize">{item.unitOfMeasure}</p>
            </div>

            <div>
              <p className="text-sm text-gray-400">Par Level</p>
              <p className="text-white">{item.parLevel} {item.unitOfMeasure}</p>
            </div>

            {item.cost && (
              <div>
                <p className="text-sm text-gray-400">Unit Cost</p>
                <p className="text-white">{formatCurrency(item.cost)}</p>
              </div>
            )}

            {item.manufacturer && (
              <div>
                <p className="text-sm text-gray-400">Manufacturer</p>
                <p className="text-white">{item.manufacturer}</p>
              </div>
            )}

            {item.partNumber && (
              <div>
                <p className="text-sm text-gray-400">Part Number</p>
                <p className="text-white">{item.partNumber}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stock Levels by Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-gray-400" />
            Stock by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {stock.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-gray-400">No stock tracked at any location</p>
              <p className="text-gray-500 text-sm mt-1">
                Use the count page to add stock for this item
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Row */}
              <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-800">
                <div>
                  <p className="text-sm text-gray-400">Total Stock (All Locations)</p>
                  <p className="text-xl font-bold text-white">{totalStock} {item.unitOfMeasure}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Combined Par Level</p>
                  <p className="text-lg text-gray-300">{stock.length * totalParLevel} {item.unitOfMeasure}</p>
                </div>
              </div>

              {/* Location List */}
              <div className="space-y-3">
                {stock.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between p-4 bg-brand-charcoal rounded-lg border border-gray-800"
                  >
                    <div>
                      <p className="text-white font-medium">{s.locationName}</p>
                      <p className="text-sm text-gray-400">
                        Last counted:{' '}
                        {s.lastCounted
                          ? new Date(s.lastCounted.toDate()).toLocaleDateString()
                          : 'Never'}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-white">
                          {s.quantity} / {s.parLevel}
                        </p>
                        <p className={cn('text-sm font-medium', getVarianceColor(s.variance))}>
                          {getVarianceDisplay(s.variance)} from par
                        </p>
                      </div>
                      <StockLevelBadge
                        quantity={s.quantity}
                        parLevel={s.parLevel}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-medium text-white mb-2">
              Delete Item?
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Are you sure you want to delete &quot;{item.name}&quot;? This will also remove all stock records for this item. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

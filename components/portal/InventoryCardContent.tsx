'use client';

import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  ClipboardList,
  Receipt,
  ArrowRight,
  Truck,
} from 'lucide-react';
import {
  useAuth,
  useContractorLocation,
  useLowStockAlerts,
  useInventoryStock,
  useReceipts,
} from '@/lib/hooks';
import { Spinner } from '@/components/ui/Spinner';

export function InventoryCardContent() {
  const { user } = useAuth();
  const { location, loading: locationLoading } = useContractorLocation(
    user?.uid || ''
  );
  const { alerts, loading: alertsLoading } = useLowStockAlerts({
    locationId: location?.id,
    realtime: true,
  });
  const { stock, loading: stockLoading } = useInventoryStock({
    locationId: location?.id,
    realtime: true,
  });
  const { receipts, loading: receiptsLoading } = useReceipts({
    uploadedBy: user?.uid,
    realtime: true,
  });

  const loading = locationLoading || alertsLoading || stockLoading || receiptsLoading;
  const pendingReceipts = receipts.filter((r) => r.status === 'pending').length;

  if (locationLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner size="md" />
      </div>
    );
  }

  if (!location) {
    return (
      <div className="text-center py-6">
        <Truck className="h-10 w-10 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 text-sm">
          No truck inventory configured. Contact an admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <Package className="h-4 w-4 text-gold" />
            <span className="text-xs text-gray-400">Items</span>
          </div>
          <p className="text-xl font-bold text-white">
            {loading ? '-' : stock.length}
          </p>
        </div>

        <div className="bg-gray-800/50 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-xs text-gray-400">Low Stock</span>
          </div>
          <p className={`text-xl font-bold ${alerts.length > 0 ? 'text-red-400' : 'text-white'}`}>
            {loading ? '-' : alerts.length}
          </p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {!alertsLoading && alerts.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-red-400 text-sm font-medium">
            {alerts.length} item{alerts.length !== 1 ? 's' : ''} need restocking
          </p>
          <div className="mt-2 space-y-1 max-h-24 overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => (
              <p key={alert.itemId} className="text-xs text-gray-400">
                • {alert.itemName}: {alert.currentQuantity}/{alert.parLevel}
              </p>
            ))}
            {alerts.length > 5 && (
              <p className="text-xs text-gray-500">
                +{alerts.length - 5} more items
              </p>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-2">
        <Link
          href="/portal/inventory/count"
          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="h-4 w-4 text-gold" />
            <div>
              <p className="text-white text-sm font-medium">Count Inventory</p>
              <p className="text-xs text-gray-500">Update stock levels</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </Link>

        <Link
          href="/portal/inventory/receipts"
          className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Receipt className="h-4 w-4 text-purple-400" />
            <div>
              <p className="text-white text-sm font-medium">Upload Receipt</p>
              <p className="text-xs text-gray-500">Submit purchases</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingReceipts > 0 && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                {pendingReceipts}
              </span>
            )}
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
        </Link>
      </div>
    </div>
  );
}

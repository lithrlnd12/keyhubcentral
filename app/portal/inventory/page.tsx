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
import { BackButton } from '@/components/ui';
import { LowStockAlertBanner, LowStockAlertList } from '@/components/inventory';

export default function ContractorInventoryPage() {
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
          No Truck Inventory Set Up
        </h2>
        <p className="text-gray-400 max-w-md mx-auto">
          Your truck inventory location hasn&apos;t been configured yet. Please contact
          an admin to set up your truck inventory.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/portal" />
        <div>
          <h1 className="text-2xl font-bold text-white">My Truck Inventory</h1>
          <p className="text-gray-400">{location.name}</p>
        </div>
      </div>

      {/* Low Stock Alert */}
      {!alertsLoading && alerts.length > 0 && (
        <LowStockAlertBanner count={alerts.length} />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Package className="h-5 w-5 text-gold" />
            </div>
            <span className="text-gray-400 text-sm">Items</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '-' : stock.length}
          </p>
        </div>

        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <span className="text-gray-400 text-sm">Below Par</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {loading ? '-' : alerts.length}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <Link
          href="/portal/inventory/count"
          className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl hover:border-gold/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <ClipboardList className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-white font-medium">Count Inventory</p>
              <p className="text-gray-400 text-sm">
                Update your truck stock levels
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </Link>

        <Link
          href="/portal/inventory/receipts"
          className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl hover:border-purple-500/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Receipt className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium">Upload Receipt</p>
              <p className="text-gray-400 text-sm">
                Submit purchase receipts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingReceipts > 0 && (
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                {pendingReceipts} pending
              </span>
            )}
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
        </Link>
      </div>

      {/* Low Stock Items */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
        <h2 className="text-lg font-medium text-white mb-4">Items Needing Restock</h2>
        {alertsLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : (
          <LowStockAlertList alerts={alerts} maxItems={10} />
        )}
      </div>
    </div>
  );
}

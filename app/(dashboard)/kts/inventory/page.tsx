'use client';

import Link from 'next/link';
import {
  Package,
  Wrench,
  AlertTriangle,
  Receipt,
  ClipboardList,
  Plus,
  ArrowRight,
  Warehouse,
  Truck,
} from 'lucide-react';
import {
  useInventoryItems,
  useLowStockAlerts,
  useInventoryCounts,
  usePendingReceiptsCount,
  useInventoryLocations,
} from '@/lib/hooks';
import { Spinner } from '@/components/ui/Spinner';
import { LowStockAlertBanner, LowStockAlertList } from '@/components/inventory';

export default function InventoryDashboardPage() {
  const { items, loading: itemsLoading } = useInventoryItems({ realtime: true });
  const { alerts, loading: alertsLoading } = useLowStockAlerts({ realtime: true });
  const { counts, loading: countsLoading } = useInventoryCounts({ limit: 5 });
  const { count: pendingReceipts, loading: receiptsLoading } = usePendingReceiptsCount();
  const { locations, loading: locationsLoading } = useInventoryLocations({ realtime: true });

  const loading = itemsLoading || alertsLoading || countsLoading || receiptsLoading || locationsLoading;

  const materialCount = items.filter((i) => i.category === 'material').length;
  const toolCount = items.filter((i) => i.category === 'tool').length;
  const warehouseCount = locations.filter((l) => l.type === 'warehouse').length;
  const truckCount = locations.filter((l) => l.type === 'truck').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Inventory</h1>
          <p className="text-gray-400">
            Track materials, tools, and stock levels
          </p>
        </div>
        <Link
          href="/kts/inventory/items/new"
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Item
        </Link>
      </div>

      {/* Low Stock Alert */}
      {!alertsLoading && alerts.length > 0 && (
        <LowStockAlertBanner
          count={alerts.length}
          href="/kts/inventory/alerts"
        />
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/kts/inventory/items?category=material"
          className="bg-brand-charcoal border border-gray-800 rounded-xl p-4 hover:border-gold/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Package className="h-5 w-5 text-gold" />
            </div>
            <span className="text-gray-400 text-sm">Materials</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '-' : materialCount}
          </p>
        </Link>

        <Link
          href="/kts/inventory/items?category=tool"
          className="bg-brand-charcoal border border-gray-800 rounded-xl p-4 hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Wrench className="h-5 w-5 text-blue-500" />
            </div>
            <span className="text-gray-400 text-sm">Tools</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? '-' : toolCount}
          </p>
        </Link>

        <Link
          href="/kts/inventory/alerts"
          className="bg-brand-charcoal border border-gray-800 rounded-xl p-4 hover:border-red-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-500/10 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <span className="text-gray-400 text-sm">Below Par</span>
          </div>
          <p className="text-2xl font-bold text-red-400">
            {loading ? '-' : alerts.length}
          </p>
        </Link>

        <Link
          href="/kts/inventory/receipts"
          className="bg-brand-charcoal border border-gray-800 rounded-xl p-4 hover:border-purple-500/50 transition-colors"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Receipt className="h-5 w-5 text-purple-400" />
            </div>
            <span className="text-gray-400 text-sm">Pending Receipts</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">
            {loading ? '-' : pendingReceipts}
          </p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-4">
        <Link
          href="/kts/inventory/count"
          className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl hover:border-gold/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <ClipboardList className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-white font-medium">Count Inventory</p>
              <p className="text-gray-400 text-sm">
                Update stock levels at a location
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </Link>

        <Link
          href="/kts/inventory/receipts/new"
          className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl hover:border-purple-500/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Receipt className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-white font-medium">Upload Receipt</p>
              <p className="text-gray-400 text-sm">
                AI-powered receipt parsing
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </Link>
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Low Stock Items</h2>
            <Link
              href="/kts/inventory/alerts"
              className="text-gold text-sm hover:underline"
            >
              View all
            </Link>
          </div>
          {alertsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : (
            <LowStockAlertList
              alerts={alerts}
              maxItems={5}
              getItemHref={(alert) => `/kts/inventory/items/${alert.itemId}`}
            />
          )}
        </div>

        {/* Locations */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white">Locations</h2>
          </div>
          {locationsLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center py-6">
              <Warehouse className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-gray-400">No locations configured</p>
            </div>
          ) : (
            <div className="space-y-2">
              {locations.slice(0, 5).map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-1.5 rounded-lg ${
                        location.type === 'warehouse'
                          ? 'bg-gold/10'
                          : 'bg-blue-500/10'
                      }`}
                    >
                      {location.type === 'warehouse' ? (
                        <Warehouse className="h-4 w-4 text-gold" />
                      ) : (
                        <Truck className="h-4 w-4 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {location.name}
                      </p>
                      <p className="text-gray-500 text-xs capitalize">
                        {location.type}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {locations.length > 5 && (
                <p className="text-center text-gray-400 text-sm py-2">
                  +{locations.length - 5} more locations
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recent Counts */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Recent Counts</h2>
        </div>
        {countsLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : counts.length === 0 ? (
          <div className="text-center py-6">
            <ClipboardList className="h-8 w-8 text-gray-600 mx-auto mb-2" />
            <p className="text-gray-400">No inventory counts yet</p>
            <Link
              href="/kts/inventory/count"
              className="text-gold text-sm hover:underline mt-2 inline-block"
            >
              Start your first count
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {counts.map((count) => (
              <div
                key={count.id}
                className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
              >
                <div>
                  <p className="text-white text-sm font-medium">
                    {count.locationName}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {count.totalItems} items • {count.countedByName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-gray-400 text-sm">
                    {count.countedAt.toDate().toLocaleDateString()}
                  </p>
                  {count.itemsBelowPar > 0 && (
                    <p className="text-red-400 text-xs">
                      {count.itemsBelowPar} below par
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

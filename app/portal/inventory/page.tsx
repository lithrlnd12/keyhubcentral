'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  ClipboardList,
  Receipt,
  ArrowRight,
  Truck,
  Settings,
  Plus,
  MapPin,
  Home,
  Warehouse,
} from 'lucide-react';
import {
  useAuth,
  useContractorLocation,
  useLowStockAlerts,
  useInventoryStock,
  useReceipts,
} from '@/lib/hooks';
import { createInventoryLocation } from '@/lib/firebase/inventoryLocations';
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
    contractorId: user?.uid,
    realtime: true,
  });

  const [showCustom, setShowCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [creating, setCreating] = useState(false);

  const loading = locationLoading || alertsLoading || stockLoading || receiptsLoading;
  const pendingReceipts = receipts.filter((r) => r.status === 'pending').length;

  const PRESET_LOCATIONS = [
    { name: 'My Truck', icon: Truck },
    { name: 'Home Garage', icon: Home },
    { name: 'Storage Unit', icon: Warehouse },
  ];

  const handleCreateLocation = async (name: string) => {
    if (!user?.uid || !name.trim()) return;
    setCreating(true);
    try {
      await createInventoryLocation({
        type: 'truck',
        name: name.trim(),
        contractorId: user.uid,
        contractorName: user.displayName || '',
        isActive: true,
      });
      // Reload page to pick up the new location
      window.location.reload();
    } catch (err) {
      console.error('Error creating location:', err);
    } finally {
      setCreating(false);
    }
  };

  if (locationLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/portal" />
        <div>
          <h1 className="text-2xl font-bold text-white">My Inventory</h1>
          {location && <p className="text-gray-400">{location.name}</p>}
        </div>
      </div>

      {/* Location Setup — shown when contractor has no location */}
      {!location && (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gold/10 rounded-lg">
              <MapPin className="h-5 w-5 text-gold" />
            </div>
            <div>
              <h3 className="text-white font-medium">Set Up Your Inventory Location</h3>
              <p className="text-gray-400 text-sm">Where do you store your materials and tools?</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {PRESET_LOCATIONS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleCreateLocation(preset.name)}
                disabled={creating}
                className="flex items-center gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg hover:border-gold/50 transition-colors disabled:opacity-50"
              >
                <preset.icon className="h-5 w-5 text-gray-400" />
                <span className="text-white text-sm">{preset.name}</span>
              </button>
            ))}
          </div>

          {!showCustom ? (
            <button
              onClick={() => setShowCustom(true)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Other
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Location name..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                autoFocus
              />
              <button
                onClick={() => handleCreateLocation(customName)}
                disabled={creating || !customName.trim()}
                className="px-4 py-2 bg-gold text-black rounded-lg font-medium text-sm hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Low Stock Alert */}
      {location && !alertsLoading && alerts.length > 0 && (
        <LowStockAlertBanner count={alerts.length} />
      )}

      {/* Stats Grid — only show if they have a location */}
      {location && (
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
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <Link
          href="/portal/inventory/items"
          className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl hover:border-blue-500/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Settings className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-white font-medium">Manage Items</p>
              <p className="text-gray-400 text-sm">
                Add or edit your inventory items
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5 text-gray-400" />
        </Link>

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

      {/* Low Stock Items — only if they have a location */}
      {location && (
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
      )}
    </div>
  );
}

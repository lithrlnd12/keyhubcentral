'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle, Package, MapPin, Filter } from 'lucide-react';
import { useLowStockAlerts, useInventoryLocations } from '@/lib/hooks';
import { Spinner } from '@/components/ui/Spinner';
import { LowStockAlertItem } from '@/components/inventory';

export default function LowStockAlertsPage() {
  const [locationFilter, setLocationFilter] = useState<string>('');
  const { alerts, loading } = useLowStockAlerts({
    locationId: locationFilter || undefined,
    realtime: true,
  });
  const { locations } = useInventoryLocations({ realtime: true });

  // Group alerts by location
  const alertsByLocation = alerts.reduce((acc, alert) => {
    if (!acc[alert.locationId]) {
      acc[alert.locationId] = {
        locationName: alert.locationName,
        alerts: [],
      };
    }
    acc[alert.locationId].alerts.push(alert);
    return acc;
  }, {} as Record<string, { locationName: string; alerts: typeof alerts }>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/kts/inventory"
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Low Stock Alerts</h1>
          <p className="text-gray-400">Items below par level that need restocking</p>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{loading ? '-' : alerts.length}</p>
            <p className="text-red-400 text-sm">Items need restocking</p>
          </div>
        </div>
      </div>

      {/* Location Filter */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-gray-400" />
        <select
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
        >
          <option value="">All Locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-12">
          <div className="p-4 bg-green-500/10 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Package className="h-8 w-8 text-green-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">All stocked up!</h3>
          <p className="text-gray-400">
            All items are at or above their par levels
          </p>
        </div>
      ) : locationFilter ? (
        // Single location view
        <div className="space-y-3">
          {alerts.map((alert) => (
            <LowStockAlertItem
              key={`${alert.itemId}-${alert.locationId}`}
              alert={alert}
              href={`/kts/inventory/items/${alert.itemId}`}
            />
          ))}
        </div>
      ) : (
        // Grouped by location view
        <div className="space-y-6">
          {Object.entries(alertsByLocation).map(([locationId, { locationName, alerts: locationAlerts }]) => (
            <div key={locationId}>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <h3 className="text-white font-medium">{locationName}</h3>
                <span className="text-red-400 text-sm">
                  ({locationAlerts.length} items)
                </span>
              </div>
              <div className="space-y-2">
                {locationAlerts.map((alert) => (
                  <LowStockAlertItem
                    key={`${alert.itemId}-${alert.locationId}`}
                    alert={alert}
                    href={`/kts/inventory/items/${alert.itemId}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reorder Suggestions */}
      {!loading && alerts.length > 0 && (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <h3 className="text-white font-medium mb-3">Reorder Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-left border-b border-gray-800">
                  <th className="pb-2">Item</th>
                  <th className="pb-2">Location</th>
                  <th className="pb-2 text-right">Current</th>
                  <th className="pb-2 text-right">Par</th>
                  <th className="pb-2 text-right">Need</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr
                    key={`${alert.itemId}-${alert.locationId}`}
                    className="border-b border-gray-800/50"
                  >
                    <td className="py-2 text-white">{alert.itemName}</td>
                    <td className="py-2 text-gray-400">{alert.locationName}</td>
                    <td className="py-2 text-right text-red-400">
                      {alert.currentQuantity}
                    </td>
                    <td className="py-2 text-right text-gray-400">
                      {alert.parLevel}
                    </td>
                    <td className="py-2 text-right text-white font-medium">
                      +{alert.shortage}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

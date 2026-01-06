'use client';

import Link from 'next/link';
import { Plus, Calendar, Package, Receipt, AlertTriangle, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ContractorFilters, ContractorList } from '@/components/contractors';
import { useContractors } from '@/lib/hooks/useContractors';
import { useAuth } from '@/lib/hooks/useAuth';
import { useLowStockAlerts } from '@/lib/hooks';
import { canManageUsers, canViewInventory } from '@/types/user';

export default function KTSPage() {
  const { user } = useAuth();
  const {
    contractors,
    loading,
    error,
    filters,
    setStatus,
    setTrade,
    setSearch,
    setFilters,
  } = useContractors({ realtime: true });
  const { alerts } = useLowStockAlerts({ realtime: true });

  const canAddContractor = user?.role && canManageUsers(user.role);
  const showInventory = user?.role && canViewInventory(user.role);

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Key Trade Solutions</h2>
          <p className="text-gray-400 mt-1">
            Manage contractors, crews, and assignments
          </p>
        </div>

        <div className="flex gap-2">
          <Link href="/kts/availability">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Availability
            </Button>
          </Link>
          {canAddContractor && (
            <Link href="/kts/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Contractor
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Inventory Quick Access - especially useful on mobile */}
      {showInventory && (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-gold" />
              <h3 className="text-white font-medium">Inventory</h3>
            </div>
            <Link
              href="/kts/inventory"
              className="text-gold text-sm hover:underline flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/kts/inventory/receipts/new"
              className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition-colors"
            >
              <Receipt className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-white text-sm font-medium">Upload Receipt</p>
                <p className="text-gray-400 text-xs">Photo or PDF</p>
              </div>
            </Link>
            <Link
              href="/kts/inventory/alerts"
              className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg hover:border-red-500/50 transition-colors"
            >
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div>
                <p className="text-white text-sm font-medium">Low Stock</p>
                <p className="text-red-400 text-xs font-medium">
                  {alerts.length} item{alerts.length !== 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          </div>
        </div>
      )}

      <ContractorFilters
        filters={filters}
        onStatusChange={setStatus}
        onTradeChange={setTrade}
        onSearchChange={setSearch}
        onClear={handleClearFilters}
      />

      <div className="text-sm text-gray-400">
        {!loading && (
          <span>
            {contractors.length} contractor{contractors.length !== 1 ? 's' : ''}
            {filters.status || filters.trade || filters.search ? ' (filtered)' : ''}
          </span>
        )}
      </div>

      <ContractorList
        contractors={contractors}
        loading={loading}
        error={error}
      />
    </div>
  );
}

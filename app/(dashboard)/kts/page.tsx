'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ContractorFilters, ContractorList } from '@/components/contractors';
import { useContractors } from '@/lib/hooks/useContractors';
import { useAuth } from '@/lib/hooks/useAuth';
import { canManageUsers } from '@/types/user';

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

  const canAddContractor = user?.role && canManageUsers(user.role);

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

        {canAddContractor && (
          <Link href="/kts/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Contractor
            </Button>
          </Link>
        )}
      </div>

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

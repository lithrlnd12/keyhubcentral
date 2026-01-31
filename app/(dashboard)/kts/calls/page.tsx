'use client';

import { Phone } from 'lucide-react';
import { InboundCallFilters, InboundCallList } from '@/components/inboundCalls';
import { useInboundCalls, useNewCallsCount } from '@/lib/hooks';

export default function CallsPage() {
  const {
    calls,
    loading,
    error,
    filters,
    setStatus,
    setSearch,
    setFilters,
  } = useInboundCalls({ realtime: true });

  const { count: newCallsCount } = useNewCallsCount();

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Inbound Calls</h2>
            {newCallsCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full">
                {newCallsCount} new
              </span>
            )}
          </div>
          <p className="text-gray-400 mt-1">
            Review and follow up on incoming customer calls
          </p>
        </div>

        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Phone className="w-4 h-4" />
          <span>
            {!loading && (
              <>
                {calls.length} call{calls.length !== 1 ? 's' : ''}
                {filters.status || filters.search ? ' (filtered)' : ''}
              </>
            )}
          </span>
        </div>
      </div>

      <InboundCallFilters
        filters={filters}
        onStatusChange={setStatus}
        onSearchChange={setSearch}
        onClear={handleClearFilters}
      />

      <InboundCallList
        calls={calls}
        loading={loading}
        error={error}
      />
    </div>
  );
}

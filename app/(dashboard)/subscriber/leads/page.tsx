'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useLeads } from '@/lib/hooks/useLeads';
import { LeadList, LeadFilters } from '@/components/leads';
import { Spinner } from '@/components/ui/Spinner';
import { getLeadCountSummary } from '@/lib/utils/leads';
import { Users, Flame, ThermometerSun, Snowflake, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function SubscriberLeadsPage() {
  const { user, loading: authLoading } = useAuth();

  const {
    leads,
    loading,
    error,
    filters,
    setStatus,
    setSource,
    setQuality,
    setSearch,
  } = useLeads({
    realtime: true,
    initialFilters: { assignedTo: user?.uid },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  const summary = getLeadCountSummary(leads);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/subscriber"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-white">My Leads</h1>
        <p className="text-gray-400 mt-1">Manage and track your assigned leads</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-gold" />
            <div>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
              <p className="text-sm text-gray-400">Total</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-red-400" />
            <div>
              <p className="text-xl font-bold text-red-400">{summary.hot}</p>
              <p className="text-xs text-gray-400">Hot</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2">
            <ThermometerSun className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-xl font-bold text-orange-400">{summary.warm}</p>
              <p className="text-xs text-gray-400">Warm</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-2">
            <Snowflake className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xl font-bold text-blue-400">{summary.cold}</p>
              <p className="text-xs text-gray-400">Cold</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <LeadFilters
        status={filters.status}
        source={filters.source}
        quality={filters.quality}
        search={filters.search}
        onStatusChange={setStatus}
        onSourceChange={setSource}
        onQualityChange={setQuality}
        onSearchChange={setSearch}
      />

      {/* Lead List */}
      <LeadList
        leads={leads}
        loading={loading}
        error={error}
        showAddButton={false}
        emptyMessage={
          filters.status || filters.source || filters.quality || filters.search
            ? 'No leads match your filters'
            : 'No leads assigned yet. Check back soon!'
        }
      />
    </div>
  );
}

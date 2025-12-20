'use client';

import { useLeads } from '@/lib/hooks/useLeads';
import { useAuth } from '@/lib/hooks/useAuth';
import { LeadList, LeadFilters } from '@/components/leads';
import { Button } from '@/components/ui/Button';
import { Plus, Users, Flame, ThermometerSun, Snowflake } from 'lucide-react';
import Link from 'next/link';
import { getLeadCountSummary } from '@/lib/utils/leads';

export default function KDPage() {
  const { user } = useAuth();
  const {
    leads,
    loading,
    error,
    filters,
    setStatus,
    setSource,
    setQuality,
    setSearch,
  } = useLeads({ realtime: true });

  const summary = getLeadCountSummary(leads);
  const canCreate = user?.role && ['owner', 'admin'].includes(user.role);
  const canViewAll = user?.role && ['owner', 'admin'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Keynote Digital</h1>
          <p className="text-gray-400 mt-1">Manage leads, campaigns, and subscriptions</p>
        </div>
        {canCreate && (
          <Link href="/kd/leads/new">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-brand-gold" />
            <div>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
              <p className="text-sm text-gray-400">Total Leads</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div>
            <p className="text-2xl font-bold text-blue-400">{summary.new}</p>
            <p className="text-sm text-gray-400">New</p>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div>
            <p className="text-2xl font-bold text-green-400">{summary.converted}</p>
            <p className="text-sm text-gray-400">Converted</p>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 col-span-2 sm:col-span-1 lg:col-span-2">
          <div className="flex items-center justify-around">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-red-400" />
              <div>
                <p className="text-xl font-bold text-red-400">{summary.hot}</p>
                <p className="text-xs text-gray-400">Hot</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThermometerSun className="w-5 h-5 text-orange-400" />
              <div>
                <p className="text-xl font-bold text-orange-400">{summary.warm}</p>
                <p className="text-xs text-gray-400">Warm</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-xl font-bold text-blue-400">{summary.cold}</p>
                <p className="text-xs text-gray-400">Cold</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      {canViewAll && (
        <div className="flex flex-wrap gap-2">
          <Link href="/kd/campaigns">
            <Button variant="outline" size="sm">
              Campaigns
            </Button>
          </Link>
          <Link href="/kd/subscribers">
            <Button variant="outline" size="sm">
              Subscribers
            </Button>
          </Link>
        </div>
      )}

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
        showAddButton={canCreate}
        emptyMessage={
          filters.status || filters.source || filters.quality || filters.search
            ? 'No leads match your filters'
            : 'No leads yet. Add your first lead to get started.'
        }
      />
    </div>
  );
}

'use client';

import { useState, useMemo } from 'react';
import { useLeads } from '@/lib/hooks/useLeads';
import { useCampaigns } from '@/lib/hooks/useCampaigns';
import { useSubscriptions } from '@/lib/hooks/useSubscriptions';
import { useAuth } from '@/lib/hooks/useAuth';
import { LeadList, LeadFilters } from '@/components/leads';
import { KDStats, LeadSourceChart, CampaignPerformance, SubscriberBreakdown } from '@/components/kd';
import { Button } from '@/components/ui/Button';
import { Plus, LayoutDashboard, Users, MapPin, Globe } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';
import { calculateDistanceMiles } from '@/lib/utils/distance';

const MAX_CLAIM_DISTANCE_MILES = 50;

type TabType = 'dashboard' | 'leads';
type LeadScope = 'nearby' | 'all';

export default function KDPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [leadScope, setLeadScope] = useState<LeadScope>('nearby');

  const {
    leads,
    loading: leadsLoading,
    error: leadsError,
    filters,
    setStatus,
    setSource,
    setQuality,
    setSearch,
  } = useLeads({ realtime: true });

  const { campaigns, loading: campaignsLoading } = useCampaigns({ realtime: true });
  const { subscriptions, loading: subscriptionsLoading } = useSubscriptions({
    realtime: true,
    initialFilters: { status: 'active' },
  });

  const canCreate = user?.role && ['owner', 'admin'].includes(user.role);
  const canViewAll = user?.role && ['owner', 'admin'].includes(user.role);
  const isSalesRep = user?.role === 'sales_rep';

  // Filter leads for sales reps: show assigned leads + claimable leads
  const visibleLeads = useMemo(() => {
    if (!isSalesRep || !user?.uid) return leads;

    return leads.filter((lead) => {
      // Show leads assigned to this sales rep
      if (lead.assignedTo === user.uid) return true;

      // Show unassigned leads
      if (lead.status === 'new' && !lead.assignedTo) {
        // "All Leads" mode - show all unassigned leads
        if (leadScope === 'all') return true;

        // "Nearby" mode - filter by distance
        if (!user.baseCoordinates || !lead.customer.address.lat || !lead.customer.address.lng) {
          return false;
        }
        const distance = calculateDistanceMiles(
          user.baseCoordinates.lat,
          user.baseCoordinates.lng,
          lead.customer.address.lat,
          lead.customer.address.lng
        );
        return distance <= MAX_CLAIM_DISTANCE_MILES;
      }

      return false;
    });
  }, [leads, isSalesRep, user, leadScope]);

  const isLoading = leadsLoading || campaignsLoading || subscriptionsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Keynote Digital</h1>
          <p className="text-gray-400 mt-1">Lead generation, campaigns, and subscriber management</p>
        </div>
        <div className="flex gap-2">
          {canViewAll && (
            <>
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
            </>
          )}
          {canCreate && (
            <Link href="/kd/leads/new">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'dashboard'
              ? 'bg-brand-gold text-black'
              : 'text-gray-400 hover:text-white'
          )}
        >
          <LayoutDashboard className="w-4 h-4" />
          Dashboard
        </button>
        <button
          onClick={() => setActiveTab('leads')}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
            activeTab === 'leads'
              ? 'bg-brand-gold text-black'
              : 'text-gray-400 hover:text-white'
          )}
        >
          <Users className="w-4 h-4" />
          Leads
        </button>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* KD Stats */}
          <KDStats
            leads={leads}
            campaigns={campaigns}
            subscriptions={subscriptions}
          />

          {/* Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <LeadSourceChart leads={leads} />
            <SubscriberBreakdown subscriptions={subscriptions} />
          </div>

          {/* Campaign Performance */}
          <CampaignPerformance campaigns={campaigns} />
        </>
      ) : (
        <>
          {/* Lead Scope Toggle for Sales Reps */}
          {isSalesRep && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Show:</span>
              <div className="flex gap-1 bg-gray-800/50 p-1 rounded-lg">
                <button
                  onClick={() => setLeadScope('nearby')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    leadScope === 'nearby'
                      ? 'bg-brand-gold text-black'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Nearby (50 mi)
                </button>
                <button
                  onClick={() => setLeadScope('all')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                    leadScope === 'all'
                      ? 'bg-brand-gold text-black'
                      : 'text-gray-400 hover:text-white'
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  All Leads
                </button>
              </div>
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
            leads={visibleLeads}
            loading={leadsLoading}
            error={leadsError}
            showAddButton={canCreate}
            emptyMessage={
              filters.status || filters.source || filters.quality || filters.search
                ? 'No leads match your filters'
                : isSalesRep
                  ? leadScope === 'nearby'
                    ? 'No nearby leads available. Try switching to "All Leads" to see leads outside your area.'
                    : 'No unassigned leads available.'
                  : 'No leads yet. Add your first lead to get started.'
            }
          />
        </>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useLeads } from '@/lib/hooks/useLeads';
import { useCampaigns } from '@/lib/hooks/useCampaigns';
import { useSubscriptions } from '@/lib/hooks/useSubscriptions';
import { useAuth } from '@/lib/hooks/useAuth';
import { LeadList, LeadFilters } from '@/components/leads';
import { KDStats, LeadSourceChart, CampaignPerformance, SubscriberBreakdown } from '@/components/kd';
import { Button } from '@/components/ui/Button';
import { Plus, LayoutDashboard, Users } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

type TabType = 'dashboard' | 'leads';

export default function KDPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

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
            loading={leadsLoading}
            error={leadsError}
            showAddButton={canCreate}
            emptyMessage={
              filters.status || filters.source || filters.quality || filters.search
                ? 'No leads match your filters'
                : 'No leads yet. Add your first lead to get started.'
            }
          />
        </>
      )}
    </div>
  );
}

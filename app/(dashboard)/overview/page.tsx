'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Target,
  Wrench,
  Building2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LazyRevenueChart as RevenueChart } from '@/components/charts';
import { LeadPipelineChart } from '@/components/charts';
import { TeamNetworkMap } from '@/components/maps';
import type { TeamMapEntry } from '@/components/maps';
import { CommunicationPulse, NeedsAttention, NetworkInviteBanner, TodaySchedule, RoleStatCards } from '@/components/dashboard';
import { useAuth, useJobs, useContractors, useInvoices, useLeads, useCampaigns } from '@/lib/hooks';
import {
  calculateEntityStats,
  generateRevenueTrend,
} from '@/lib/utils/dashboard';
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';
import { tenant } from '@/lib/config/tenant';
import { ADMIN_ROLES } from '@/types/user';
import type { UserRole } from '@/types/user';

export default function OverviewPage() {
  const { user } = useAuth();
  const role = user?.role as UserRole;
  const isAdmin = role && ADMIN_ROLES.includes(role);
  const isSalesRep = role === 'sales_rep';

  const { jobs, loading: jobsLoading } = useJobs({ realtime: true });
  const { contractors, loading: contractorsLoading } = useContractors({ realtime: true });
  const { invoices, loading: invoicesLoading } = useInvoices({ realtime: true });
  const { leads, loading: leadsLoading } = useLeads({ realtime: true });
  const { campaigns, loading: campaignsLoading } = useCampaigns({ realtime: true });

  const loading = jobsLoading || contractorsLoading || invoicesLoading || leadsLoading || campaignsLoading;

  // Entity stats (for business unit cards)
  const entityStats = useMemo(() => {
    if (loading) return null;
    const now = new Date();
    const activeCampaigns = campaigns.filter((c) => {
      const startDate = c.startDate?.toDate?.() || new Date(0);
      const endDate = c.endDate?.toDate?.() || null;
      return startDate <= now && (endDate === null || endDate >= now);
    }).length;
    return calculateEntityStats(jobs, leads, contractors, invoices, activeCampaigns);
  }, [jobs, leads, contractors, invoices, campaigns, loading]);

  const revenueTrend = useMemo(() => {
    if (loading) return [];
    return generateRevenueTrend(invoices);
  }, [invoices, loading]);

  // Team Network Map data (admin/owner only)
  const [teamMapEntries, setTeamMapEntries] = useState<TeamMapEntry[]>([]);
  const [teamMapLoading, setTeamMapLoading] = useState(false);

  const fetchTeamMap = useCallback(async () => {
    if (!isAdmin) return;
    setTeamMapLoading(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const token = await getAuth().currentUser?.getIdToken();
      if (!token) return;
      const res = await fetch('/api/team/map', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTeamMapEntries(data.entries || []);
      }
    } catch (err) {
      console.error('Failed to fetch team map data:', err);
    } finally {
      setTeamMapLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchTeamMap();
  }, [fetchTeamMap]);

  // Outstanding invoices
  const outstandingAmount = useMemo(() => {
    if (loading) return 0;
    return invoices
      .filter((inv) => inv && inv.status !== 'paid')
      .reduce((sum, inv) => sum + (inv?.total || 0), 0);
  }, [invoices, loading]);

  // Dynamic greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <div className="space-y-6">
      {/* Network Invite Banner (visible to admins with pending inbound invites) */}
      <NetworkInviteBanner />

      {/* Welcome + Communication Pulse */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              {greeting}, {user?.displayName?.split(' ')[0] || 'User'}
            </h2>
          </div>
        </div>
        <CommunicationPulse />
      </div>

      {/* Needs Attention (replaces static Quick Actions) */}
      <NeedsAttention />

      {/* Role-Aware Stat Cards */}
      <RoleStatCards />

      {/* Main Content: Charts + Schedule */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Trend (admin/owner/pm get full view) */}
        {!isSalesRep ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Revenue Trend (6 Months)</CardTitle>
            </CardHeader>
            <CardContent>
              <RevenueChart data={revenueTrend} />
            </CardContent>
          </Card>
        ) : (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Lead Pipeline</CardTitle>
            </CardHeader>
            <CardContent>
              <LeadPipelineChart leads={leads} />
            </CardContent>
          </Card>
        )}

        {/* Today's Schedule */}
        <TodaySchedule />
      </div>

      {/* Business Units + Pipeline */}
      {!isSalesRep && (
        <div className="grid lg:grid-cols-4 gap-4">
          {/* Business Unit Cards (admin/owner) */}
          {isAdmin && (
            <>
              <Link href="/kts">
                <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800 hover:border-blue-500/50 transition-colors h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                      <Wrench className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-white">{tenant.entities.kts.label}</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Active Contractors</span>
                      <span className="text-white">{entityStats?.kts.activeContractors || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Jobs This Month</span>
                      <span className="text-white">{entityStats?.kts.jobsThisMonth || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Revenue</span>
                      <span className="text-blue-400">{formatCurrency(entityStats?.kts.revenue || 0)}</span>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/kr">
                <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800 hover:border-green-500/50 transition-colors h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-500/10 rounded-lg">
                      <Building2 className="w-5 h-5 text-green-400" />
                    </div>
                    <h3 className="font-semibold text-white">{tenant.entities.kr.label}</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Active Jobs</span>
                      <span className="text-white">{entityStats?.kr.activeJobs || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Completed (MTD)</span>
                      <span className="text-white">{entityStats?.kr.completedMTD || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Revenue</span>
                      <span className="text-green-400">{formatCurrency(entityStats?.kr.revenue || 0)}</span>
                    </div>
                  </div>
                </div>
              </Link>

              <Link href="/kd">
                <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800 hover:border-purple-500/50 transition-colors h-full">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      <Target className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-white">{tenant.entities.kd.label}</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Leads Generated</span>
                      <span className="text-white">{entityStats?.kd.leadsGenerated || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Active Campaigns</span>
                      <span className="text-white">{entityStats?.kd.activeCampaigns || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Revenue</span>
                      <span className="text-purple-400">{formatCurrency(entityStats?.kd.revenue || 0)}</span>
                    </div>
                  </div>
                </div>
              </Link>
            </>
          )}

          {/* Lead Pipeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lead Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <LeadPipelineChart leads={leads} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Network Map (admin/owner only) */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle>Team Network</CardTitle>
          </CardHeader>
          <CardContent>
            <TeamNetworkMap
              entries={teamMapEntries}
              loading={teamMapLoading}
              className="h-[500px]"
            />
          </CardContent>
        </Card>
      )}

      {/* Outstanding Amount (admin/owner only) */}
      {isAdmin && outstandingAmount > 0 && (
        <Card className="border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-500/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Outstanding Invoices</p>
                  <p className="text-sm text-gray-400">
                    {formatCurrency(outstandingAmount)} awaiting payment
                  </p>
                </div>
              </div>
              <Link
                href="/financials"
                className="text-brand-gold hover:text-brand-gold-light text-sm font-medium"
              >
                View All
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

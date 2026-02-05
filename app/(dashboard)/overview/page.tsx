'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Users,
  Briefcase,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Wrench,
  Building2,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import {
  LazyRevenueChart as RevenueChart,
  LazyLeadSourceChart as LeadSourceChart,
  LazyJobTypeChart as JobTypeChart,
  LazyBusinessFlowDiagram as BusinessFlowDiagram,
} from '@/components/charts';
import { useAuth, useJobs, useContractors, useInvoices, useLeads, useCampaigns } from '@/lib/hooks';
import {
  calculateDashboardStats,
  calculateEntityStats,
  calculateBusinessFlowStats,
  generateRevenueTrend,
  getLeadSourceDistribution,
  getJobTypeDistribution,
} from '@/lib/utils/dashboard';
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  href?: string;
}

function StatCard({ title, value, change, changeType = 'neutral', icon, href }: StatCardProps) {
  const changeColors = {
    positive: 'text-green-500',
    negative: 'text-red-500',
    neutral: 'text-gray-400',
  };

  const content = (
    <div className="bg-brand-charcoal rounded-xl p-4 md:p-6 border border-gray-800 hover:border-brand-gold/30 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-brand-gold/10 rounded-lg">
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

interface QuickActionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
}

function QuickAction({ title, description, icon, href }: QuickActionProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-4 bg-brand-charcoal rounded-xl border border-gray-800 hover:border-brand-gold/50 transition-colors"
    >
      <div className="p-3 bg-brand-gold/10 rounded-lg">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium text-white">{title}</p>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-gray-500" />
    </Link>
  );
}

// Stages that sales reps can see (up to and including front_end_hold)
const SALES_REP_VISIBLE_STAGES = ['lead', 'sold', 'front_end_hold'];

export default function OverviewPage() {
  const { user } = useAuth();
  const { jobs: allJobs, loading: jobsLoading } = useJobs({ realtime: true });
  const { contractors, loading: contractorsLoading } = useContractors({ realtime: true });
  const { invoices, loading: invoicesLoading } = useInvoices({ realtime: true });
  const { leads, loading: leadsLoading } = useLeads({ realtime: true });
  const { campaigns, loading: campaignsLoading } = useCampaigns({ realtime: true });

  const loading = jobsLoading || contractorsLoading || invoicesLoading || leadsLoading || campaignsLoading;

  // Sales reps only see their jobs up through front_end_hold in stats
  const isSalesRep = user?.role === 'sales_rep';
  const jobs = useMemo(() => {
    if (!isSalesRep || !user?.uid) return allJobs;
    return allJobs.filter(
      (job) =>
        job.salesRepId === user.uid &&
        SALES_REP_VISIBLE_STAGES.includes(job.status)
    );
  }, [allJobs, isSalesRep, user?.uid]);

  // Calculate stats
  const stats = useMemo(() => {
    if (loading) return null;
    return calculateDashboardStats(jobs, leads, contractors, invoices);
  }, [jobs, leads, contractors, invoices, loading]);

  const entityStats = useMemo(() => {
    if (loading) return null;
    // Active campaigns are those currently running (startDate <= now <= endDate or no endDate)
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

  const leadSources = useMemo(() => {
    if (loading) return [];
    return getLeadSourceDistribution(leads);
  }, [leads, loading]);

  const jobTypes = useMemo(() => {
    if (loading) return [];
    return getJobTypeDistribution(jobs);
  }, [jobs, loading]);

  const businessFlowStats = useMemo(() => {
    if (loading) return null;
    const now = new Date();
    const activeCampaigns = campaigns.filter((c) => {
      const startDate = c.startDate?.toDate?.() || new Date(0);
      const endDate = c.endDate?.toDate?.() || null;
      return startDate <= now && (endDate === null || endDate >= now);
    }).length;
    return calculateBusinessFlowStats(jobs, leads, contractors, invoices, activeCampaigns);
  }, [jobs, leads, contractors, invoices, campaigns, loading]);

  return (
    <div className="space-y-6">
      {/* Welcome message */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-white">
            Welcome back, {user?.displayName?.split(' ')[0] || 'User'}
          </h2>
          <p className="text-gray-400 mt-1">
            Here&apos;s what&apos;s happening across your businesses today.
          </p>
        </div>

        {/* Alerts */}
        {stats && stats.overdueInvoices > 0 && (
          <Link href="/financials?overdue=true">
            <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                {stats.overdueInvoices} overdue invoice{stats.overdueInvoices !== 1 ? 's' : ''}
              </span>
            </div>
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue (MTD)"
          value={formatCurrency(stats?.totalRevenue || 0)}
          change={stats?.revenueChange ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}% from last month` : undefined}
          changeType={stats?.revenueChange && stats.revenueChange > 0 ? 'positive' : stats?.revenueChange && stats.revenueChange < 0 ? 'negative' : 'neutral'}
          icon={<DollarSign className="w-5 h-5 text-brand-gold" />}
          href="/financials"
        />
        <StatCard
          title="Active Jobs"
          value={String(stats?.activeJobs || 0)}
          change={stats?.jobsStartingThisWeek ? `${stats.jobsStartingThisWeek} starting this week` : undefined}
          changeType="neutral"
          icon={<Briefcase className="w-5 h-5 text-brand-gold" />}
          href="/kr"
        />
        <StatCard
          title="Active Contractors"
          value={String(stats?.activeContractors || 0)}
          change={stats?.pendingContractors ? `${stats.pendingContractors} pending approval` : undefined}
          changeType="neutral"
          icon={<Users className="w-5 h-5 text-brand-gold" />}
          href="/kts"
        />
        <StatCard
          title="Leads (MTD)"
          value={String(stats?.leadsMTD || 0)}
          change={stats?.leadsChange ? `${stats.leadsChange > 0 ? '+' : ''}${stats.leadsChange.toFixed(1)}% from last month` : undefined}
          changeType={stats?.leadsChange && stats.leadsChange > 0 ? 'positive' : stats?.leadsChange && stats.leadsChange < 0 ? 'negative' : 'neutral'}
          icon={<TrendingUp className="w-5 h-5 text-brand-gold" />}
          href="/kd"
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue Trend (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueTrend} />
          </CardContent>
        </Card>

        {/* Lead Sources */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Sources (MTD)</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadSourceChart data={leadSources} />
          </CardContent>
        </Card>
      </div>

      {/* Business Units + Job Types */}
      <div className="grid lg:grid-cols-4 gap-4">
        {/* KTS */}
        <Link href="/kts">
          <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800 hover:border-blue-500/50 transition-colors h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Wrench className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">Key Trade Solutions</h3>
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

        {/* KR */}
        <Link href="/kr">
          <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800 hover:border-green-500/50 transition-colors h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Building2 className="w-5 h-5 text-green-400" />
              </div>
              <h3 className="font-semibold text-white">Key Renovations</h3>
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

        {/* KD */}
        <Link href="/kd">
          <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800 hover:border-purple-500/50 transition-colors h-full">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Target className="w-5 h-5 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white">Keynote Digital</h3>
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

        {/* Job Types Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Jobs by Type</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <JobTypeChart data={jobTypes} />
          </CardContent>
        </Card>
      </div>

      {/* Business Flow Diagram */}
      <Card>
        <CardHeader>
          <CardTitle>Business Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <BusinessFlowDiagram stats={businessFlowStats || undefined} />
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickAction
            title="New Lead"
            description="Add a new lead"
            icon={<Target className="w-5 h-5 text-brand-gold" />}
            href="/kd/leads/new"
          />
          <QuickAction
            title="Create Invoice"
            description="Generate invoice"
            icon={<DollarSign className="w-5 h-5 text-brand-gold" />}
            href="/financials/invoices/new"
          />
          <QuickAction
            title="Add Contractor"
            description="Onboard new contractor"
            icon={<Users className="w-5 h-5 text-brand-gold" />}
            href="/kts/new"
          />
          <QuickAction
            title="New Job"
            description="Create a job"
            icon={<Briefcase className="w-5 h-5 text-brand-gold" />}
            href="/kr/new"
          />
        </div>
      </div>

      {/* Outstanding Amount */}
      {stats && stats.outstandingAmount > 0 && (
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
                    {formatCurrency(stats.outstandingAmount)} awaiting payment
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

'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Briefcase,
  Users,
  TrendingUp,
  Target,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useAuth, useJobs, useContractors, useInvoices, useLeads, useCampaigns } from '@/lib/hooks';
import { calculateDashboardStats } from '@/lib/utils/dashboard';
import { formatCurrency } from '@/lib/utils/formatters';
import type { UserRole } from '@/types/user';
import { ADMIN_ROLES } from '@/types/user';

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

// Sales rep only sees their own pipeline
const SALES_REP_VISIBLE_STAGES = ['lead', 'sold', 'front_end_hold'];

export function RoleStatCards() {
  const { user } = useAuth();
  const role = user?.role as UserRole;
  const isAdmin = role && ADMIN_ROLES.includes(role);
  const isSalesRep = role === 'sales_rep';
  const isPM = role === 'pm';

  const { jobs: allJobs, loading: jobsLoading } = useJobs({ realtime: true });
  const { contractors, loading: contractorsLoading } = useContractors({ realtime: true });
  const { invoices, loading: invoicesLoading } = useInvoices({ realtime: true });
  const { leads, loading: leadsLoading } = useLeads({ realtime: true });

  const loading = jobsLoading || contractorsLoading || invoicesLoading || leadsLoading;

  // Filter jobs for sales reps
  const jobs = useMemo(() => {
    if (!isSalesRep || !user?.uid) return allJobs;
    return allJobs.filter(
      (job) => job.salesRepId === user.uid && SALES_REP_VISIBLE_STAGES.includes(job.status)
    );
  }, [allJobs, isSalesRep, user?.uid]);

  const stats = useMemo(() => {
    if (loading) return null;
    return calculateDashboardStats(jobs, leads, contractors, invoices);
  }, [jobs, leads, contractors, invoices, loading]);

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-brand-charcoal rounded-xl p-4 md:p-6 border border-gray-800 animate-pulse">
            <div className="h-4 bg-gray-700 rounded w-24 mb-3" />
            <div className="h-8 bg-gray-700 rounded w-16" />
          </div>
        ))}
      </div>
    );
  }

  // Sales rep cards
  if (isSalesRep) {
    const myLeads = leads.filter((l) => l.assignedTo === user?.uid);
    const myActiveLeads = myLeads.filter((l) => !['converted', 'lost'].includes(l.status)).length;
    const myConverted = myLeads.filter((l) => l.status === 'converted').length;
    const conversionRate = myLeads.length > 0 ? (myConverted / myLeads.length * 100) : 0;

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="My Active Leads"
          value={String(myActiveLeads)}
          icon={<Target className="w-5 h-5 text-brand-gold" />}
          href="/kd?assigned=me"
        />
        <StatCard
          title="My Pipeline"
          value={String(jobs.length)}
          change={`${stats.jobsStartingThisWeek} starting this week`}
          icon={<Briefcase className="w-5 h-5 text-brand-gold" />}
          href="/kr"
        />
        <StatCard
          title="Conversion Rate"
          value={`${conversionRate.toFixed(0)}%`}
          change={`${myConverted} converted`}
          changeType="positive"
          icon={<TrendingUp className="w-5 h-5 text-brand-gold" />}
        />
        <StatCard
          title="Leads (MTD)"
          value={String(stats.leadsMTD)}
          change={stats.leadsChange ? `${stats.leadsChange > 0 ? '+' : ''}${stats.leadsChange.toFixed(1)}% from last month` : undefined}
          changeType={stats.leadsChange > 0 ? 'positive' : stats.leadsChange < 0 ? 'negative' : 'neutral'}
          icon={<TrendingUp className="w-5 h-5 text-brand-gold" />}
          href="/kd"
        />
      </div>
    );
  }

  // PM cards
  if (isPM) {
    const activeJobsByStage = {
      production: allJobs.filter((j) => j.status === 'production').length,
      scheduled: allJobs.filter((j) => j.status === 'scheduled').length,
      started: allJobs.filter((j) => j.status === 'started').length,
    };

    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Jobs"
          value={String(stats.activeJobs)}
          change={`${stats.jobsStartingThisWeek} starting this week`}
          icon={<Briefcase className="w-5 h-5 text-brand-gold" />}
          href="/kr"
        />
        <StatCard
          title="In Production"
          value={String(activeJobsByStage.production)}
          icon={<Clock className="w-5 h-5 text-brand-gold" />}
          href="/kr?status=production"
        />
        <StatCard
          title="Scheduled / Started"
          value={`${activeJobsByStage.scheduled} / ${activeJobsByStage.started}`}
          icon={<CheckCircle2 className="w-5 h-5 text-brand-gold" />}
          href="/kr?status=scheduled"
        />
        <StatCard
          title="Active Contractors"
          value={String(stats.activeContractors)}
          change={stats.pendingContractors ? `${stats.pendingContractors} pending` : undefined}
          icon={<Users className="w-5 h-5 text-brand-gold" />}
          href="/kts"
        />
      </div>
    );
  }

  // Admin/Owner cards (default)
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Revenue (MTD)"
        value={formatCurrency(stats.totalRevenue)}
        change={stats.revenueChange ? `${stats.revenueChange > 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}% from last month` : undefined}
        changeType={stats.revenueChange > 0 ? 'positive' : stats.revenueChange < 0 ? 'negative' : 'neutral'}
        icon={<DollarSign className="w-5 h-5 text-brand-gold" />}
        href="/financials"
      />
      <StatCard
        title="Active Jobs"
        value={String(stats.activeJobs)}
        change={stats.jobsStartingThisWeek ? `${stats.jobsStartingThisWeek} starting this week` : undefined}
        icon={<Briefcase className="w-5 h-5 text-brand-gold" />}
        href="/kr"
      />
      <StatCard
        title="Active Contractors"
        value={String(stats.activeContractors)}
        change={stats.pendingContractors ? `${stats.pendingContractors} pending approval` : undefined}
        icon={<Users className="w-5 h-5 text-brand-gold" />}
        href="/kts"
      />
      <StatCard
        title="Leads (MTD)"
        value={String(stats.leadsMTD)}
        change={stats.leadsChange ? `${stats.leadsChange > 0 ? '+' : ''}${stats.leadsChange.toFixed(1)}% from last month` : undefined}
        changeType={stats.leadsChange > 0 ? 'positive' : stats.leadsChange < 0 ? 'negative' : 'neutral'}
        icon={<TrendingUp className="w-5 h-5 text-brand-gold" />}
        href="/kd"
      />
    </div>
  );
}

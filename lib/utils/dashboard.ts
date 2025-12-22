import { Job } from '@/types/job';
import { Lead } from '@/types/lead';
import { Contractor } from '@/types/contractor';
import { Invoice } from '@/types/invoice';
import { Timestamp } from 'firebase/firestore';

export interface DashboardStats {
  // Revenue
  totalRevenue: number;
  revenueChange: number;

  // Jobs
  activeJobs: number;
  jobsStartingThisWeek: number;
  completedJobsMTD: number;

  // Contractors
  activeContractors: number;
  pendingContractors: number;

  // Leads
  leadsMTD: number;
  leadsChange: number;

  // Invoices
  overdueInvoices: number;
  outstandingAmount: number;
}

export interface EntityStats {
  kts: {
    activeContractors: number;
    jobsThisMonth: number;
    revenue: number;
  };
  kr: {
    activeJobs: number;
    completedMTD: number;
    revenue: number;
  };
  kd: {
    leadsGenerated: number;
    activeCampaigns: number;
    revenue: number;
  };
}

export interface RevenueDataPoint {
  month: string;
  kd: number;
  kts: number;
  kr: number;
  total: number;
}

export interface LeadSourceData {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

export interface JobTypeData {
  name: string;
  count: number;
  [key: string]: string | number;
}

// Get start of current month
function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

// Get start of last month
function getStartOfLastMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

// Get start of this week
function getStartOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek;
  return new Date(now.setDate(diff));
}

// Get end of this week
function getEndOfWeek(): Date {
  const start = getStartOfWeek();
  return new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
}

// Helper to safely get Date from Timestamp (local to this section)
function safeDateConvert(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  return null;
}

// Calculate dashboard stats
export function calculateDashboardStats(
  jobs: Job[],
  leads: Lead[],
  contractors: Contractor[],
  invoices: Invoice[]
): DashboardStats {
  const startOfMonth = getStartOfMonth();
  const startOfLastMonth = getStartOfLastMonth();
  const weekStart = getStartOfWeek();
  const weekEnd = getEndOfWeek();
  const now = new Date();

  // Safe arrays
  const safeJobs = Array.isArray(jobs) ? jobs.filter(Boolean) : [];
  const safeLeads = Array.isArray(leads) ? leads.filter(Boolean) : [];
  const safeContractors = Array.isArray(contractors) ? contractors.filter(Boolean) : [];
  const safeInvoices = Array.isArray(invoices) ? invoices.filter(Boolean) : [];

  // Revenue from paid invoices this month
  const thisMonthInvoices = safeInvoices.filter((inv) => {
    if (inv?.status !== 'paid' || !inv?.paidAt) return false;
    const paidDate = safeDateConvert(inv.paidAt);
    return paidDate && paidDate >= startOfMonth;
  });
  const totalRevenue = thisMonthInvoices.reduce((sum, inv) => sum + (inv?.total || 0), 0);

  // Revenue from last month for comparison
  const lastMonthInvoices = safeInvoices.filter((inv) => {
    if (inv?.status !== 'paid' || !inv?.paidAt) return false;
    const paidDate = safeDateConvert(inv.paidAt);
    return paidDate && paidDate >= startOfLastMonth && paidDate < startOfMonth;
  });
  const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + (inv?.total || 0), 0);
  const revenueChange = lastMonthRevenue > 0
    ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  // Active jobs (not complete or paid in full)
  const activeJobs = safeJobs.filter(
    (job) => job && !['complete', 'paid_in_full'].includes(job.status)
  ).length;

  // Jobs starting this week
  const jobsStartingThisWeek = safeJobs.filter((job) => {
    if (!job?.dates?.scheduledStart) return false;
    const startDate = safeDateConvert(job.dates.scheduledStart);
    return startDate && startDate >= weekStart && startDate <= weekEnd;
  }).length;

  // Completed jobs MTD
  const completedJobsMTD = safeJobs.filter((job) => {
    if (!job || !['complete', 'paid_in_full'].includes(job.status)) return false;
    const completedDate = safeDateConvert(job.dates?.actualCompletion);
    return completedDate && completedDate >= startOfMonth;
  }).length;

  // Contractors
  const activeContractors = safeContractors.filter((c) => c?.status === 'active').length;
  const pendingContractors = safeContractors.filter((c) => c?.status === 'pending').length;

  // Leads MTD
  const leadsMTD = safeLeads.filter((lead) => {
    if (!lead?.createdAt) return false;
    const createdAt = safeDateConvert(lead.createdAt);
    return createdAt && createdAt >= startOfMonth;
  }).length;

  // Leads last month for comparison
  const leadsLastMonth = safeLeads.filter((lead) => {
    if (!lead?.createdAt) return false;
    const createdAt = safeDateConvert(lead.createdAt);
    return createdAt && createdAt >= startOfLastMonth && createdAt < startOfMonth;
  }).length;
  const leadsChange = leadsLastMonth > 0
    ? ((leadsMTD - leadsLastMonth) / leadsLastMonth) * 100
    : 0;

  // Overdue invoices
  const overdueInvoices = safeInvoices.filter((inv) => {
    if (!inv || inv.status === 'paid' || !inv.dueDate) return false;
    const dueDate = safeDateConvert(inv.dueDate);
    return dueDate && dueDate < now;
  }).length;

  // Outstanding amount
  const outstandingAmount = safeInvoices
    .filter((inv) => inv && inv.status !== 'paid')
    .reduce((sum, inv) => sum + (inv?.total || 0), 0);

  return {
    totalRevenue,
    revenueChange,
    activeJobs,
    jobsStartingThisWeek,
    completedJobsMTD,
    activeContractors,
    pendingContractors,
    leadsMTD,
    leadsChange,
    overdueInvoices,
    outstandingAmount,
  };
}

// Calculate entity-specific stats
export function calculateEntityStats(
  jobs: Job[],
  leads: Lead[],
  contractors: Contractor[],
  invoices: Invoice[],
  campaignCount: number
): EntityStats {
  const startOfMonth = getStartOfMonth();

  // Safe arrays
  const safeJobs = Array.isArray(jobs) ? jobs.filter(Boolean) : [];
  const safeLeads = Array.isArray(leads) ? leads.filter(Boolean) : [];
  const safeContractors = Array.isArray(contractors) ? contractors.filter(Boolean) : [];
  const safeInvoices = Array.isArray(invoices) ? invoices.filter(Boolean) : [];

  // KTS stats
  const ktsActiveContractors = safeContractors.filter((c) => c?.status === 'active').length;
  const ktsJobsThisMonth = safeJobs.filter((job) => {
    if (!job?.createdAt) return false;
    const createdAt = safeDateConvert(job.createdAt);
    return createdAt && createdAt >= startOfMonth;
  }).length;
  const ktsRevenue = safeInvoices
    .filter((inv) => {
      if (!inv?.from?.entity || inv.from.entity !== 'kts') return false;
      if (inv.status !== 'paid' || !inv.paidAt) return false;
      const paidDate = safeDateConvert(inv.paidAt);
      return paidDate && paidDate >= startOfMonth;
    })
    .reduce((sum, inv) => sum + (inv?.total || 0), 0);

  // KR stats
  const krActiveJobs = safeJobs.filter(
    (job) => job && !['complete', 'paid_in_full'].includes(job.status)
  ).length;
  const krCompletedMTD = safeJobs.filter((job) => {
    if (!job || !['complete', 'paid_in_full'].includes(job.status)) return false;
    const completedDate = safeDateConvert(job.dates?.actualCompletion);
    return completedDate && completedDate >= startOfMonth;
  }).length;
  const krRevenue = safeInvoices
    .filter((inv) => {
      if (!inv?.from?.entity || inv.from.entity !== 'kr') return false;
      if (inv.status !== 'paid' || !inv.paidAt) return false;
      const paidDate = safeDateConvert(inv.paidAt);
      return paidDate && paidDate >= startOfMonth;
    })
    .reduce((sum, inv) => sum + (inv?.total || 0), 0);

  // KD stats
  const kdLeadsGenerated = safeLeads.filter((lead) => {
    if (!lead?.createdAt) return false;
    const createdAt = safeDateConvert(lead.createdAt);
    return createdAt && createdAt >= startOfMonth;
  }).length;
  const kdRevenue = safeInvoices
    .filter((inv) => {
      if (!inv?.from?.entity || inv.from.entity !== 'kd') return false;
      if (inv.status !== 'paid' || !inv.paidAt) return false;
      const paidDate = safeDateConvert(inv.paidAt);
      return paidDate && paidDate >= startOfMonth;
    })
    .reduce((sum, inv) => sum + (inv?.total || 0), 0);

  return {
    kts: {
      activeContractors: ktsActiveContractors,
      jobsThisMonth: ktsJobsThisMonth,
      revenue: ktsRevenue,
    },
    kr: {
      activeJobs: krActiveJobs,
      completedMTD: krCompletedMTD,
      revenue: krRevenue,
    },
    kd: {
      leadsGenerated: kdLeadsGenerated,
      activeCampaigns: campaignCount,
      revenue: kdRevenue,
    },
  };
}

// Generate revenue trend data
export function generateRevenueTrend(invoices: Invoice[]): RevenueDataPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  const data: RevenueDataPoint[] = [];

  // Safe invoices array
  const safeInvoices = Array.isArray(invoices) ? invoices.filter(Boolean) : [];

  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const year = new Date().getFullYear() - (currentMonth - i < 0 ? 1 : 0);
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);

    let kdRevenue = 0;
    let ktsRevenue = 0;
    let krRevenue = 0;

    safeInvoices.forEach((inv) => {
      if (!inv || inv.status !== 'paid' || !inv.paidAt) return;
      const paidDate = safeDateConvert(inv.paidAt);
      if (!paidDate || paidDate < monthStart || paidDate > monthEnd) return;

      const entity = inv.from?.entity;
      const total = inv.total || 0;
      if (entity === 'kd') kdRevenue += total;
      else if (entity === 'kts') ktsRevenue += total;
      else if (entity === 'kr') krRevenue += total;
    });

    data.push({
      month: months[monthIndex],
      kd: kdRevenue,
      kts: ktsRevenue,
      kr: krRevenue,
      total: kdRevenue + ktsRevenue + krRevenue,
    });
  }

  return data;
}

// Helper to safely get Date from Timestamp
function safeToDate(timestamp: any): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  return null;
}

// Get lead source distribution
export function getLeadSourceDistribution(leads: Lead[]): LeadSourceData[] {
  if (!leads || !Array.isArray(leads)) return [];

  const startOfMonth = getStartOfMonth();
  const mtdLeads = leads.filter((lead) => {
    if (!lead || !lead.createdAt) return false;
    const createdDate = safeToDate(lead.createdAt);
    return createdDate && createdDate >= startOfMonth;
  });

  const sourceCount: Record<string, number> = {};
  mtdLeads.forEach((lead) => {
    const source = lead.source || 'other';
    sourceCount[source] = (sourceCount[source] || 0) + 1;
  });

  const colors: Record<string, string> = {
    google_ads: '#4285F4',
    meta: '#1877F2',
    tiktok: '#000000',
    referral: '#10B981',
    event: '#F59E0B',
    other: '#6B7280',
  };

  const labels: Record<string, string> = {
    google_ads: 'Google Ads',
    meta: 'Meta',
    tiktok: 'TikTok',
    referral: 'Referral',
    event: 'Event',
    other: 'Other',
  };

  return Object.entries(sourceCount).map(([source, count]) => ({
    name: labels[source] || source,
    value: count,
    color: colors[source] || '#6B7280',
  }));
}

// Calculate business flow stats
export interface BusinessFlowStats {
  kd: {
    leadsGenerated: number;
    activeCampaigns: number;
    conversionRate: number;
  };
  kts: {
    activeContractors: number;
    jobsCompleted: number;
    avgRating: number;
  };
  kr: {
    activeJobs: number;
    revenue: number;
    avgJobValue: number;
  };
}

export function calculateBusinessFlowStats(
  jobs: Job[],
  leads: Lead[],
  contractors: Contractor[],
  invoices: Invoice[],
  campaignCount: number
): BusinessFlowStats {
  const startOfMonth = getStartOfMonth();

  // Safe arrays
  const safeLeads = Array.isArray(leads) ? leads : [];
  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const safeContractors = Array.isArray(contractors) ? contractors : [];
  const safeInvoices = Array.isArray(invoices) ? invoices : [];

  // KD stats
  const leadsGenerated = safeLeads.filter((lead) => {
    if (!lead?.createdAt) return false;
    const createdDate = safeToDate(lead.createdAt);
    return createdDate && createdDate >= startOfMonth;
  }).length;
  const convertedLeads = safeLeads.filter((lead) => lead?.status === 'converted').length;
  const conversionRate = safeLeads.length > 0 ? (convertedLeads / safeLeads.length) * 100 : 0;

  // KTS stats
  const activeContractors = safeContractors.filter((c) => c?.status === 'active').length;
  const completedJobs = safeJobs.filter((job) => job && ['complete', 'paid_in_full'].includes(job.status)).length;
  const avgRating = safeContractors.length > 0
    ? safeContractors.reduce((sum, c) => sum + (c?.rating?.overall || 0), 0) / safeContractors.length
    : 0;

  // KR stats
  const activeJobs = safeJobs.filter((job) => job && !['complete', 'paid_in_full'].includes(job.status)).length;
  const krRevenue = safeInvoices
    .filter((inv) => {
      if (!inv?.from?.entity || !inv?.paidAt) return false;
      const paidDate = safeToDate(inv.paidAt);
      return inv.from.entity === 'kr' && inv.status === 'paid' && paidDate && paidDate >= startOfMonth;
    })
    .reduce((sum, inv) => sum + (inv?.total || 0), 0);
  const completedJobsWithValue = safeJobs.filter(
    (job) => job && ['complete', 'paid_in_full'].includes(job.status)
  );
  // Calculate avg job value from projected material + labor costs
  const avgJobValue = completedJobsWithValue.length > 0
    ? completedJobsWithValue.reduce((sum, job) =>
        sum + (job?.costs?.materialProjected || 0) + (job?.costs?.laborProjected || 0), 0
      ) / completedJobsWithValue.length
    : 0;

  return {
    kd: {
      leadsGenerated,
      activeCampaigns: campaignCount,
      conversionRate,
    },
    kts: {
      activeContractors,
      jobsCompleted: completedJobs,
      avgRating,
    },
    kr: {
      activeJobs,
      revenue: krRevenue,
      avgJobValue,
    },
  };
}

// Get job type distribution
export function getJobTypeDistribution(jobs: Job[]): JobTypeData[] {
  if (!jobs || !Array.isArray(jobs)) return [];

  const typeCount: Record<string, number> = {};

  jobs.forEach((job) => {
    if (!job) return;
    const type = job.type || 'other';
    typeCount[type] = (typeCount[type] || 0) + 1;
  });

  const labels: Record<string, string> = {
    bathroom: 'Bathroom',
    kitchen: 'Kitchen',
    exterior: 'Exterior',
    other: 'Other',
  };

  return Object.entries(typeCount).map(([type, count]) => ({
    name: labels[type] || type,
    count,
  }));
}

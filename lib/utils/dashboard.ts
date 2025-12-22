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

// Calculate dashboard stats
export function calculateDashboardStats(
  jobs: Job[],
  leads: Lead[],
  contractors: Contractor[],
  invoices: Invoice[]
): DashboardStats {
  const startOfMonth = getStartOfMonth();
  const startOfLastMonth = getStartOfLastMonth();
  const startOfWeek = getStartOfWeek();
  const endOfWeek = getEndOfWeek();
  const now = new Date();

  // Revenue from paid invoices this month
  const thisMonthInvoices = invoices.filter(
    (inv) =>
      inv.status === 'paid' &&
      inv.paidAt &&
      inv.paidAt.toDate() >= startOfMonth
  );
  const totalRevenue = thisMonthInvoices.reduce((sum, inv) => sum + inv.total, 0);

  // Revenue from last month for comparison
  const lastMonthInvoices = invoices.filter(
    (inv) =>
      inv.status === 'paid' &&
      inv.paidAt &&
      inv.paidAt.toDate() >= startOfLastMonth &&
      inv.paidAt.toDate() < startOfMonth
  );
  const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const revenueChange = lastMonthRevenue > 0
    ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  // Active jobs (not complete or paid in full)
  const activeJobs = jobs.filter(
    (job) => !['complete', 'paid_in_full'].includes(job.status)
  ).length;

  // Jobs starting this week
  const jobsStartingThisWeek = jobs.filter((job) => {
    if (!job.dates.scheduledStart) return false;
    const startDate = job.dates.scheduledStart.toDate();
    return startDate >= startOfWeek && startDate <= endOfWeek;
  }).length;

  // Completed jobs MTD
  const completedJobsMTD = jobs.filter((job) => {
    if (!['complete', 'paid_in_full'].includes(job.status)) return false;
    const completedDate = job.dates.actualCompletion?.toDate();
    return completedDate && completedDate >= startOfMonth;
  }).length;

  // Contractors
  const activeContractors = contractors.filter((c) => c.status === 'active').length;
  const pendingContractors = contractors.filter((c) => c.status === 'pending').length;

  // Leads MTD
  const leadsMTD = leads.filter((lead) => {
    const createdAt = lead.createdAt.toDate();
    return createdAt >= startOfMonth;
  }).length;

  // Leads last month for comparison
  const leadsLastMonth = leads.filter((lead) => {
    const createdAt = lead.createdAt.toDate();
    return createdAt >= startOfLastMonth && createdAt < startOfMonth;
  }).length;
  const leadsChange = leadsLastMonth > 0
    ? ((leadsMTD - leadsLastMonth) / leadsLastMonth) * 100
    : 0;

  // Overdue invoices
  const overdueInvoices = invoices.filter((inv) => {
    if (inv.status === 'paid') return false;
    return inv.dueDate.toDate() < now;
  }).length;

  // Outstanding amount
  const outstandingAmount = invoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

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

  // KTS stats
  const ktsActiveContractors = contractors.filter((c) => c.status === 'active').length;
  const ktsJobsThisMonth = jobs.filter((job) => {
    const createdAt = job.createdAt.toDate();
    return createdAt >= startOfMonth;
  }).length;
  const ktsRevenue = invoices
    .filter(
      (inv) =>
        inv.from.entity === 'kts' &&
        inv.status === 'paid' &&
        inv.paidAt &&
        inv.paidAt.toDate() >= startOfMonth
    )
    .reduce((sum, inv) => sum + inv.total, 0);

  // KR stats
  const krActiveJobs = jobs.filter(
    (job) => !['complete', 'paid_in_full'].includes(job.status)
  ).length;
  const krCompletedMTD = jobs.filter((job) => {
    if (!['complete', 'paid_in_full'].includes(job.status)) return false;
    const completedDate = job.dates.actualCompletion?.toDate();
    return completedDate && completedDate >= startOfMonth;
  }).length;
  const krRevenue = invoices
    .filter(
      (inv) =>
        inv.from.entity === 'kr' &&
        inv.status === 'paid' &&
        inv.paidAt &&
        inv.paidAt.toDate() >= startOfMonth
    )
    .reduce((sum, inv) => sum + inv.total, 0);

  // KD stats
  const kdLeadsGenerated = leads.filter((lead) => {
    const createdAt = lead.createdAt.toDate();
    return createdAt >= startOfMonth;
  }).length;
  const kdRevenue = invoices
    .filter(
      (inv) =>
        inv.from.entity === 'kd' &&
        inv.status === 'paid' &&
        inv.paidAt &&
        inv.paidAt.toDate() >= startOfMonth
    )
    .reduce((sum, inv) => sum + inv.total, 0);

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

// Generate mock revenue trend data (replace with real data later)
export function generateRevenueTrend(invoices: Invoice[]): RevenueDataPoint[] {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  const data: RevenueDataPoint[] = [];

  // Get last 6 months
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (currentMonth - i + 12) % 12;
    const year = new Date().getFullYear() - (currentMonth - i < 0 ? 1 : 0);
    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0);

    let kdRevenue = 0;
    let ktsRevenue = 0;
    let krRevenue = 0;

    invoices.forEach((inv) => {
      if (inv.status !== 'paid' || !inv.paidAt) return;
      const paidDate = inv.paidAt.toDate();
      if (paidDate < startOfMonth || paidDate > endOfMonth) return;

      if (inv.from.entity === 'kd') kdRevenue += inv.total;
      else if (inv.from.entity === 'kts') ktsRevenue += inv.total;
      else if (inv.from.entity === 'kr') krRevenue += inv.total;
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

// Get lead source distribution
export function getLeadSourceDistribution(leads: Lead[]): LeadSourceData[] {
  const startOfMonth = getStartOfMonth();
  const mtdLeads = leads.filter((lead) => lead.createdAt.toDate() >= startOfMonth);

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

  // KD stats
  const leadsGenerated = leads.filter((lead) => lead.createdAt.toDate() >= startOfMonth).length;
  const convertedLeads = leads.filter((lead) => lead.status === 'converted').length;
  const conversionRate = leads.length > 0 ? (convertedLeads / leads.length) * 100 : 0;

  // KTS stats
  const activeContractors = contractors.filter((c) => c.status === 'active').length;
  const completedJobs = jobs.filter((job) => ['complete', 'paid_in_full'].includes(job.status)).length;
  const avgRating = contractors.length > 0
    ? contractors.reduce((sum, c) => sum + (c.rating?.overall || 0), 0) / contractors.length
    : 0;

  // KR stats
  const activeJobs = jobs.filter((job) => !['complete', 'paid_in_full'].includes(job.status)).length;
  const krRevenue = invoices
    .filter(
      (inv) =>
        inv.from.entity === 'kr' &&
        inv.status === 'paid' &&
        inv.paidAt &&
        inv.paidAt.toDate() >= startOfMonth
    )
    .reduce((sum, inv) => sum + inv.total, 0);
  const completedJobsWithValue = jobs.filter(
    (job) => ['complete', 'paid_in_full'].includes(job.status)
  );
  // Calculate avg job value from projected material + labor costs
  const avgJobValue = completedJobsWithValue.length > 0
    ? completedJobsWithValue.reduce((sum, job) =>
        sum + (job.costs?.materialProjected || 0) + (job.costs?.laborProjected || 0), 0
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
  const typeCount: Record<string, number> = {};

  jobs.forEach((job) => {
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

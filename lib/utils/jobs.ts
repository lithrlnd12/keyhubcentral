import { Job, JobStatus, JobType, JobCosts, JOB_STATUS_ORDER } from '@/types/job';
import { Timestamp } from 'firebase/firestore';

// Status display labels
export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  lead: 'Lead',
  sold: 'Sold',
  front_end_hold: 'Front End Hold',
  production: 'Production',
  scheduled: 'Scheduled',
  started: 'Started',
  complete: 'Complete',
  paid_in_full: 'Paid in Full',
};

// Status colors for badges
export const JOB_STATUS_COLORS: Record<JobStatus, { bg: string; text: string; border: string }> = {
  lead: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  sold: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  front_end_hold: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  production: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  scheduled: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  started: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  complete: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  paid_in_full: { bg: 'bg-brand-gold/20', text: 'text-brand-gold', border: 'border-brand-gold/30' },
};

// Job type labels
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  bathroom: 'Bathroom',
  kitchen: 'Kitchen',
  exterior: 'Exterior',
  other: 'Other',
};

// Job type icons
export const JOB_TYPE_ICONS: Record<JobType, string> = {
  bathroom: '🚿',
  kitchen: '🍳',
  exterior: '🏠',
  other: '🔧',
};

// Format job status for display
export function formatJobStatus(status: JobStatus): string {
  return JOB_STATUS_LABELS[status] || status;
}

// Format job type for display
export function formatJobType(type: JobType): string {
  return JOB_TYPE_LABELS[type] || type;
}

// Calculate job progress percentage
export function getJobProgress(status: JobStatus): number {
  const index = JOB_STATUS_ORDER.indexOf(status);
  if (index === -1) return 0;
  return Math.round((index / (JOB_STATUS_ORDER.length - 1)) * 100);
}

// Calculate cost variance
export function calculateCostVariance(costs: JobCosts): {
  materialVariance: number;
  laborVariance: number;
  totalVariance: number;
  materialVariancePercent: number;
  laborVariancePercent: number;
  totalVariancePercent: number;
} {
  const materialVariance = costs.materialActual - costs.materialProjected;
  const laborVariance = costs.laborActual - costs.laborProjected;
  const totalVariance = materialVariance + laborVariance;

  const totalProjected = costs.materialProjected + costs.laborProjected;
  const totalActual = costs.materialActual + costs.laborActual;

  return {
    materialVariance,
    laborVariance,
    totalVariance,
    materialVariancePercent: costs.materialProjected > 0
      ? (materialVariance / costs.materialProjected) * 100
      : 0,
    laborVariancePercent: costs.laborProjected > 0
      ? (laborVariance / costs.laborProjected) * 100
      : 0,
    totalVariancePercent: totalProjected > 0
      ? ((totalActual - totalProjected) / totalProjected) * 100
      : 0,
  };
}

// Calculate profit margin
export function calculateProfitMargin(revenue: number, costs: JobCosts): {
  grossProfit: number;
  marginPercent: number;
} {
  const totalCost = costs.materialActual + costs.laborActual;
  const grossProfit = revenue - totalCost;
  const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  return { grossProfit, marginPercent };
}

// Check if job is overdue based on target completion
export function isJobOverdue(job: Job): boolean {
  if (job.status === 'complete' || job.status === 'paid_in_full') return false;
  if (!job.dates.targetCompletion) return false;

  const target = job.dates.targetCompletion.toDate();
  return new Date() > target;
}

// Calculate days until target completion (or days overdue if negative)
export function getDaysUntilCompletion(job: Job): number | null {
  if (!job.dates.targetCompletion) return null;

  const target = job.dates.targetCompletion.toDate();
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Format date from Timestamp
export function formatJobDate(timestamp: Timestamp | null): string {
  if (!timestamp) return '—';
  return timestamp.toDate().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Format date range
export function formatDateRange(start: Timestamp | null, end: Timestamp | null): string {
  if (!start && !end) return '—';
  if (!start) return `Until ${formatJobDate(end)}`;
  if (!end) return `From ${formatJobDate(start)}`;
  return `${formatJobDate(start)} - ${formatJobDate(end)}`;
}

// Get warranty status text and color
export function getWarrantyInfo(job: Job): {
  status: string;
  color: string;
  daysRemaining: number | null;
} {
  if (!job.warranty.startDate || !job.warranty.endDate) {
    return { status: 'Not Started', color: 'text-gray-500', daysRemaining: null };
  }

  const now = new Date();
  const end = job.warranty.endDate.toDate();
  const diffTime = end.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return { status: 'Expired', color: 'text-red-400', daysRemaining: 0 };
  }

  if (daysRemaining < 30) {
    return { status: 'Expiring Soon', color: 'text-yellow-400', daysRemaining };
  }

  return { status: 'Active', color: 'text-green-400', daysRemaining };
}

// Sort jobs by various criteria
export type JobSortField = 'createdAt' | 'jobNumber' | 'customer' | 'status' | 'targetCompletion';
export type SortDirection = 'asc' | 'desc';

export function sortJobs(
  jobs: Job[],
  field: JobSortField,
  direction: SortDirection = 'desc'
): Job[] {
  return [...jobs].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case 'createdAt':
        comparison = a.createdAt.seconds - b.createdAt.seconds;
        break;
      case 'jobNumber':
        comparison = a.jobNumber.localeCompare(b.jobNumber);
        break;
      case 'customer':
        comparison = a.customer.name.localeCompare(b.customer.name);
        break;
      case 'status':
        comparison = JOB_STATUS_ORDER.indexOf(a.status) - JOB_STATUS_ORDER.indexOf(b.status);
        break;
      case 'targetCompletion':
        const aDate = a.dates.targetCompletion?.seconds || 0;
        const bDate = b.dates.targetCompletion?.seconds || 0;
        comparison = aDate - bDate;
        break;
    }

    return direction === 'asc' ? comparison : -comparison;
  });
}

// Group jobs by status for pipeline view
export function groupJobsByStatus(jobs: Job[]): Record<JobStatus, Job[]> {
  const grouped: Record<JobStatus, Job[]> = {
    lead: [],
    sold: [],
    front_end_hold: [],
    production: [],
    scheduled: [],
    started: [],
    complete: [],
    paid_in_full: [],
  };

  jobs.forEach((job) => {
    // Handle invalid status gracefully
    const status = grouped[job.status] ? job.status : 'lead';
    grouped[status].push(job);
  });

  return grouped;
}

// Get job count summary
export function getJobCountSummary(jobs: Job[]): {
  total: number;
  active: number;
  completed: number;
  overdue: number;
} {
  let active = 0;
  let completed = 0;
  let overdue = 0;

  jobs.forEach((job) => {
    if (job.status === 'complete' || job.status === 'paid_in_full') {
      completed++;
    } else {
      active++;
      if (isJobOverdue(job)) {
        overdue++;
      }
    }
  });

  return {
    total: jobs.length,
    active,
    completed,
    overdue,
  };
}

import { Job } from '@/types/job';
import { Contractor, getRatingTier, getCommissionRate } from '@/types/contractor';
import { Invoice } from '@/types/invoice';
import { Timestamp } from 'firebase/firestore';

export interface ContractorEarnings {
  contractorId: string;
  contractorName: string;
  jobsCompleted: number;
  totalLabor: number;
  totalCommission: number;
  totalEarnings: number;
  pendingPayments: number;
  paidPayments: number;
  rating: number;
  commissionRate: number;
}

export interface EarningsPeriod {
  label: string;
  startDate: Date;
  endDate: Date;
}

// Calculate earnings for a single contractor
export function calculateContractorEarnings(
  contractor: Contractor,
  jobs: Job[],
  invoices: Invoice[]
): ContractorEarnings {
  // Get jobs where this contractor was part of the crew
  const contractorJobs = jobs.filter(
    (job) =>
      job.crewIds?.includes(contractor.userId) ||
      job.salesRepId === contractor.userId ||
      job.pmId === contractor.userId
  );

  // Completed jobs
  const completedJobs = contractorJobs.filter(
    (job) => job.status === 'complete' || job.status === 'paid_in_full'
  );

  // Get commission rate based on rating
  const tier = getRatingTier(contractor.rating.overall);
  const commissionRate = getCommissionRate(tier);

  // Calculate labor earnings (for installers)
  let totalLabor = 0;
  completedJobs.forEach((job) => {
    if (job.crewIds?.includes(contractor.userId)) {
      // Split labor among crew members
      const crewCount = job.crewIds.length || 1;
      totalLabor += (job.costs.laborActual || 0) / crewCount;
    }
  });

  // Calculate commission earnings (for sales reps)
  let totalCommission = 0;
  if (contractor.trades.includes('sales_rep')) {
    const salesJobs = completedJobs.filter((job) => job.salesRepId === contractor.userId);
    salesJobs.forEach((job) => {
      const jobValue =
        job.costs.materialActual + job.costs.laborActual || job.costs.materialProjected + job.costs.laborProjected;
      totalCommission += jobValue * commissionRate;
    });
  }

  // Get invoices related to this contractor's payments
  const contractorInvoices = invoices.filter(
    (inv) =>
      inv.from.entity === 'kts' &&
      inv.lineItems.some(
        (item) =>
          item.description.toLowerCase().includes(contractor.businessName?.toLowerCase() || '') ||
          item.description.includes(contractor.userId)
      )
  );

  const pendingPayments = contractorInvoices
    .filter((inv) => inv.status !== 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const paidPayments = contractorInvoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  return {
    contractorId: contractor.id,
    contractorName: contractor.businessName || `Contractor ${contractor.id.slice(0, 6)}`,
    jobsCompleted: completedJobs.length,
    totalLabor,
    totalCommission,
    totalEarnings: totalLabor + totalCommission,
    pendingPayments,
    paidPayments,
    rating: contractor.rating.overall,
    commissionRate,
  };
}

// Calculate earnings for all contractors
export function calculateAllContractorEarnings(
  contractors: Contractor[],
  jobs: Job[],
  invoices: Invoice[]
): ContractorEarnings[] {
  return contractors
    .filter((c) => c.status === 'active')
    .map((contractor) => calculateContractorEarnings(contractor, jobs, invoices))
    .sort((a, b) => b.totalEarnings - a.totalEarnings);
}

// Get earnings summary
export function getEarningsSummary(earnings: ContractorEarnings[]): {
  totalPaid: number;
  totalPending: number;
  totalEarnings: number;
  avgEarnings: number;
  topEarner: ContractorEarnings | null;
} {
  const totalPaid = earnings.reduce((sum, e) => sum + e.paidPayments, 0);
  const totalPending = earnings.reduce((sum, e) => sum + e.pendingPayments, 0);
  const totalEarnings = earnings.reduce((sum, e) => sum + e.totalEarnings, 0);
  const avgEarnings = earnings.length > 0 ? totalEarnings / earnings.length : 0;
  const topEarner = earnings.length > 0 ? earnings[0] : null;

  return {
    totalPaid,
    totalPending,
    totalEarnings,
    avgEarnings,
    topEarner,
  };
}

// Get current period dates
export function getCurrentPeriodDates(): {
  mtd: { start: Date; end: Date };
  ytd: { start: Date; end: Date };
} {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return {
    mtd: {
      start: new Date(year, month, 1),
      end: now,
    },
    ytd: {
      start: new Date(year, 0, 1),
      end: now,
    },
  };
}

// Filter jobs by date range
export function filterJobsByDateRange(jobs: Job[], startDate: Date, endDate: Date): Job[] {
  return jobs.filter((job) => {
    const completedDate = job.dates.actualCompletion || job.dates.paidInFull;
    if (!completedDate) return false;

    const completedMs = completedDate.toMillis();
    return completedMs >= startDate.getTime() && completedMs <= endDate.getTime();
  });
}

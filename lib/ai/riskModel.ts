import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Job, JobType } from '@/types/job';
import { ServiceTicket } from '@/types/job';
import { HistoricalData } from './riskScoring';

// ============================================================
// Historical Data Fetching
// ============================================================

/**
 * Retrieve historical callback data for a specific installer.
 *
 * Queries completed jobs for this contractor over the last 12 months,
 * then checks for service tickets filed within 30 days of each job's
 * completion to calculate callback statistics.
 */
export async function getInstallerHistoricalData(
  contractorId: string
): Promise<HistoricalData> {
  const twelveMonthsAgo = Timestamp.fromDate(
    new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
  );

  // Fetch completed jobs for this contractor in the last 12 months
  const jobsQuery = query(
    collection(db, 'jobs'),
    where('crewIds', 'array-contains', contractorId),
    where('status', 'in', ['complete', 'paid_in_full']),
    orderBy('createdAt', 'desc')
  );

  const jobsSnapshot = await getDocs(jobsQuery);
  const jobs = jobsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as Job))
    .filter((job) => {
      // Filter to last 12 months based on completion date or creation date
      const completionDate = job.dates?.actualCompletion || job.dates?.created;
      if (!completionDate) return false;
      return completionDate.toMillis() >= twelveMonthsAgo.toMillis();
    });

  if (jobs.length === 0) {
    return {
      totalJobs: 0,
      callbackCount: 0,
      callbackRate: 0,
      avgDaysToCallback: null,
    };
  }

  // Fetch all service tickets for these jobs
  const jobIds = jobs.map((j) => j.id);
  let callbackCount = 0;
  let totalDaysToCallback = 0;
  let callbacksWithDays = 0;

  // Firestore 'in' queries are limited to 30 items, so batch
  const batchSize = 30;
  for (let i = 0; i < jobIds.length; i += batchSize) {
    const batch = jobIds.slice(i, i + batchSize);
    const ticketsQuery = query(
      collection(db, 'serviceTickets'),
      where('jobId', 'in', batch)
    );

    const ticketsSnapshot = await getDocs(ticketsQuery);
    const tickets = ticketsSnapshot.docs.map(
      (doc) => ({ id: doc.id, ...doc.data() } as ServiceTicket)
    );

    for (const ticket of tickets) {
      // Find the parent job to check if ticket was within 30 days of completion
      const parentJob = jobs.find((j) => j.id === ticket.jobId);
      if (!parentJob) continue;

      const completionDate = parentJob.dates?.actualCompletion;
      if (!completionDate || !ticket.createdAt) {
        // No completion date to compare — count it as a callback anyway
        callbackCount++;
        continue;
      }

      const completionMs = completionDate.toMillis();
      const ticketMs = ticket.createdAt.toMillis();
      const daysDiff = (ticketMs - completionMs) / (1000 * 60 * 60 * 24);

      // Only count service tickets filed within 30 days of completion as callbacks
      if (daysDiff >= 0 && daysDiff <= 30) {
        callbackCount++;
        totalDaysToCallback += daysDiff;
        callbacksWithDays++;
      }
    }
  }

  const totalJobs = jobs.length;
  const callbackRate = totalJobs > 0 ? callbackCount / totalJobs : 0;
  const avgDaysToCallback =
    callbacksWithDays > 0
      ? Math.round(totalDaysToCallback / callbacksWithDays)
      : null;

  return {
    totalJobs,
    callbackCount,
    callbackRate,
    avgDaysToCallback,
  };
}

// ============================================================
// Job Type Risk Baselines (lookup table, not ML)
// ============================================================

interface JobTypeRiskBaseline {
  type: JobType;
  label: string;
  baselineCallbackRate: number; // percentage 0-100
  avgCallbackCost: number; // average cost in dollars
  commonIssues: string[];
}

const JOB_TYPE_BASELINES: Record<JobType, JobTypeRiskBaseline> = {
  bathroom: {
    type: 'bathroom',
    label: 'Bathroom Remodel',
    baselineCallbackRate: 4.5,
    avgCallbackCost: 350,
    commonIssues: [
      'Plumbing leaks',
      'Tile grout cracking',
      'Caulking failure',
      'Fixture alignment',
    ],
  },
  kitchen: {
    type: 'kitchen',
    label: 'Kitchen Remodel',
    baselineCallbackRate: 7.2,
    avgCallbackCost: 500,
    commonIssues: [
      'Cabinet alignment',
      'Countertop seaming',
      'Plumbing connections',
      'Appliance fitting',
      'Backsplash adhesion',
    ],
  },
  exterior: {
    type: 'exterior',
    label: 'Exterior Work',
    baselineCallbackRate: 5.8,
    avgCallbackCost: 420,
    commonIssues: [
      'Water infiltration',
      'Paint peeling',
      'Siding gaps',
      'Flashing issues',
      'Drainage problems',
    ],
  },
  other: {
    type: 'other',
    label: 'General / Other',
    baselineCallbackRate: 4.0,
    avgCallbackCost: 300,
    commonIssues: [
      'Finish quality',
      'Material defects',
      'Workmanship issues',
    ],
  },
};

/**
 * Get baseline risk statistics for a given job type.
 * Returns industry-informed constants (not derived from ML).
 */
export function getJobTypeRiskBaseline(
  jobType: JobType
): JobTypeRiskBaseline {
  return JOB_TYPE_BASELINES[jobType] || JOB_TYPE_BASELINES.other;
}

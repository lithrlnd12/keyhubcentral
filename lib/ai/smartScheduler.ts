import { Job } from '@/types/job';
import { Contractor, getRatingTier, RatingTier } from '@/types/contractor';
import { Availability, TimeBlock, TIME_BLOCKS } from '@/types/availability';
import { calculateAddressDistance, getDistanceScore } from '@/lib/utils/distance';

// ============================================================
// Types
// ============================================================

export interface ScheduleRecommendation {
  contractorId: string;
  contractorName: string;
  contractorRating: number;
  contractorTier: string;
  timeBlock: TimeBlock;
  date: string;
  score: number; // 0-100 composite
  scoreBreakdown: {
    availability: number;
    distance: number;
    rating: number;
    workload: number;
    historicalPerformance: number;
  };
  distanceMiles: number;
  estimatedTravelTime: string;
}

export interface BulkScheduleResult {
  jobId: string;
  jobNumber: string;
  customerName: string;
  recommendations: ScheduleRecommendation[];
  assigned?: ScheduleRecommendation; // after optimization
}

// ============================================================
// Configurable Scoring Weights (must sum to 1.0)
// ============================================================

export const SCORING_WEIGHTS = {
  availability: 0.30,
  distance: 0.25,
  rating: 0.20,
  workload: 0.15,
  historicalPerformance: 0.10,
} as const;

// Maximum active jobs before a contractor scores 0 on workload
const MAX_ACTIVE_JOBS = 8;

// Average travel speed in mph for estimated travel time
const AVG_TRAVEL_SPEED_MPH = 30;

// Default service radius when contractor has none set
const DEFAULT_SERVICE_RADIUS = 30;

// ============================================================
// Individual Factor Scoring (pure functions)
// ============================================================

/**
 * Score availability: is the contractor available on the given date and time block?
 * Returns 0-100.
 */
function scoreAvailability(
  contractorId: string,
  date: string,
  timeBlock: TimeBlock,
  availabilityMap: Map<string, Map<string, Availability>>
): number {
  const contractorAvail = availabilityMap.get(contractorId);

  // No availability data — assume available (score 70, not perfect since unconfirmed)
  if (!contractorAvail) return 70;

  const dayAvail = contractorAvail.get(date);

  // No record for this date — assume available
  if (!dayAvail) return 70;

  const blockStatus = dayAvail.blocks[timeBlock];

  switch (blockStatus) {
    case 'available':
      return 100;
    case 'busy':
      return 20;
    case 'unavailable':
    case 'on_leave':
      return 0;
    default:
      return 70;
  }
}

/**
 * Score distance: how far is the contractor from the job site?
 * Uses the existing getDistanceScore utility. Returns 0-100.
 */
function scoreDistance(contractor: Contractor, job: Job): { score: number; distanceMiles: number } {
  const distance = calculateAddressDistance(contractor.address, job.customer?.address);

  if (distance === null) {
    // Missing coordinates — return a neutral score
    return { score: 50, distanceMiles: -1 };
  }

  const radius = contractor.serviceRadius || DEFAULT_SERVICE_RADIUS;
  const score = getDistanceScore(distance, radius);

  return { score, distanceMiles: distance };
}

/**
 * Score contractor rating: higher rating = higher score. Returns 0-100.
 */
function scoreRating(contractor: Contractor): number {
  const overall = contractor.rating?.overall ?? 0;

  if (overall === 0) return 50; // No rating data

  // Scale 1-5 rating to 0-100
  // 5.0 → 100, 4.0 → 80, 3.0 → 60, 2.0 → 40, 1.0 → 20
  return Math.max(0, Math.min(100, Math.round(overall * 20)));
}

/**
 * Score workload: fewer active jobs = higher score. Returns 0-100.
 */
function scoreWorkload(
  contractorId: string,
  activeJobCounts: Map<string, number>
): number {
  const count = activeJobCounts.get(contractorId) ?? 0;

  if (count >= MAX_ACTIVE_JOBS) return 0;

  // Linear scale: 0 jobs → 100, MAX_ACTIVE_JOBS → 0
  return Math.round(100 * (1 - count / MAX_ACTIVE_JOBS));
}

/**
 * Score historical performance: based on rating tier as a proxy for
 * past completion reliability. Returns 0-100.
 *
 * In a production system this would query actual completion data.
 * For now we derive it from the contractor's rating tier.
 */
function scoreHistoricalPerformance(contractor: Contractor): number {
  const overall = contractor.rating?.overall ?? 0;

  if (overall === 0) return 50; // No data — neutral

  const tier: RatingTier = getRatingTier(overall);

  switch (tier) {
    case 'elite':
      return 100;
    case 'pro':
      return 80;
    case 'standard':
      return 60;
    case 'needs_improvement':
      return 35;
    case 'probation':
      return 10;
    default:
      return 50;
  }
}

/**
 * Estimate travel time string from distance.
 */
function estimateTravelTime(distanceMiles: number): string {
  if (distanceMiles < 0) return 'Unknown';
  if (distanceMiles < 1) return '< 5 min';

  const minutes = Math.round((distanceMiles / AVG_TRAVEL_SPEED_MPH) * 60);

  if (minutes < 60) return `~${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `~${hours} hr`;
  return `~${hours} hr ${remainingMinutes} min`;
}

// ============================================================
// Main Recommendation Function
// ============================================================

/**
 * Score each contractor for a specific job and return the top 5 ranked recommendations.
 *
 * Pure function: same inputs always produce the same outputs.
 * Handles missing data gracefully with sensible defaults.
 */
export function getScheduleRecommendations(
  job: Job,
  contractors: Contractor[],
  availabilityMap: Map<string, Map<string, Availability>>,
  activeJobCounts: Map<string, number>
): ScheduleRecommendation[] {
  // Determine the target date: use scheduledStart if set, otherwise today
  let targetDate: string;
  if (job.dates?.scheduledStart && typeof job.dates.scheduledStart.toDate === 'function') {
    const d = job.dates.scheduledStart.toDate();
    targetDate = d.toISOString().split('T')[0];
  } else {
    targetDate = new Date().toISOString().split('T')[0];
  }

  const recommendations: ScheduleRecommendation[] = [];

  for (const contractor of contractors) {
    // Score each time block and pick the best one for this contractor
    let bestBlock: TimeBlock = 'am';
    let bestAvailScore = -1;

    for (const block of TIME_BLOCKS) {
      const availScore = scoreAvailability(contractor.id, targetDate, block, availabilityMap);
      if (availScore > bestAvailScore) {
        bestAvailScore = availScore;
        bestBlock = block;
      }
    }

    // Skip contractors who are completely unavailable on this date
    if (bestAvailScore === 0) continue;

    const { score: distScore, distanceMiles } = scoreDistance(contractor, job);
    const ratingScore = scoreRating(contractor);
    const workloadScore = scoreWorkload(contractor.id, activeJobCounts);
    const histScore = scoreHistoricalPerformance(contractor);

    const breakdown = {
      availability: bestAvailScore,
      distance: distScore,
      rating: ratingScore,
      workload: workloadScore,
      historicalPerformance: histScore,
    };

    const compositeScore = Math.round(
      breakdown.availability * SCORING_WEIGHTS.availability +
      breakdown.distance * SCORING_WEIGHTS.distance +
      breakdown.rating * SCORING_WEIGHTS.rating +
      breakdown.workload * SCORING_WEIGHTS.workload +
      breakdown.historicalPerformance * SCORING_WEIGHTS.historicalPerformance
    );

    const tier = getRatingTier(contractor.rating?.overall ?? 0);

    recommendations.push({
      contractorId: contractor.id,
      contractorName: contractor.businessName || contractor.id,
      contractorRating: contractor.rating?.overall ?? 0,
      contractorTier: tier,
      timeBlock: bestBlock,
      date: targetDate,
      score: Math.max(0, Math.min(100, compositeScore)),
      scoreBreakdown: breakdown,
      distanceMiles,
      estimatedTravelTime: estimateTravelTime(distanceMiles),
    });
  }

  // Sort by score descending, return top 5
  recommendations.sort((a, b) => b.score - a.score);
  return recommendations.slice(0, 5);
}

// ============================================================
// Bulk Schedule Optimizer (Greedy)
// ============================================================

/**
 * Greedy optimizer for scheduling multiple unscheduled jobs.
 *
 * Algorithm:
 * 1. Sort jobs by priority (higher value first, then oldest creation date first)
 * 2. For each job: get top recommendations, assign the best available contractor
 * 3. After assignment: increment that contractor's workload count
 * 4. Prevent double-booking via a Set of `${contractorId}-${date}-${timeBlock}` keys
 *
 * Complexity: O(n * m) where n = jobs, m = contractors. Practical for 5-20 jobs/day.
 */
export function optimizeBulkSchedule(
  unscheduledJobs: Job[],
  contractors: Contractor[],
  availabilityMap: Map<string, Map<string, Availability>>,
  activeJobCounts: Map<string, number>
): BulkScheduleResult[] {
  // Mutable copy of workload counts so assignments update them
  const workloadCounts = new Map(activeJobCounts);

  // Track assigned slots to prevent double-booking
  const assignedSlots = new Set<string>();

  // Sort jobs: higher total cost first, then oldest created first
  const sortedJobs = [...unscheduledJobs].sort((a, b) => {
    const valueA = (a.costs?.materialProjected || 0) + (a.costs?.laborProjected || 0);
    const valueB = (b.costs?.materialProjected || 0) + (b.costs?.laborProjected || 0);

    if (valueB !== valueA) return valueB - valueA; // Higher value first

    // Oldest created first (earlier timestamp = smaller)
    const createdA = a.dates?.created && typeof a.dates.created.toDate === 'function'
      ? a.dates.created.toDate().getTime()
      : Infinity;
    const createdB = b.dates?.created && typeof b.dates.created.toDate === 'function'
      ? b.dates.created.toDate().getTime()
      : Infinity;

    return createdA - createdB;
  });

  const results: BulkScheduleResult[] = [];

  for (const job of sortedJobs) {
    // Get recommendations using current workload state
    const recommendations = getScheduleRecommendations(
      job,
      contractors,
      availabilityMap,
      workloadCounts
    );

    let assigned: ScheduleRecommendation | undefined;

    // Try each recommendation in score order until we find one without a booking conflict
    for (const rec of recommendations) {
      const slotKey = `${rec.contractorId}-${rec.date}-${rec.timeBlock}`;

      if (!assignedSlots.has(slotKey)) {
        assigned = rec;
        assignedSlots.add(slotKey);

        // Update workload for subsequent jobs
        const currentCount = workloadCounts.get(rec.contractorId) ?? 0;
        workloadCounts.set(rec.contractorId, currentCount + 1);

        break;
      }
    }

    results.push({
      jobId: job.id,
      jobNumber: job.jobNumber,
      customerName: job.customer?.name || 'Unknown',
      recommendations,
      assigned,
    });
  }

  return results;
}

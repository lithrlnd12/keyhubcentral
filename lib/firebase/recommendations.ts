import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './config';
import { getContractorsBlockAvailability } from './availability';
import { Contractor, Trade, Address } from '@/types/contractor';
import { TimeBlock, AvailabilityStatus } from '@/types/availability';
import {
  ContractorRecommendation,
  RECOMMENDATION_WEIGHTS,
  RecommendationFilters,
  DEFAULT_SERVICE_RADIUS_MILES,
} from '@/types/scheduling';
import {
  calculateAddressDistance,
  getDistanceScore,
  isWithinServiceRadius,
} from '@/lib/utils/distance';

/**
 * Get contractor recommendations for a job
 *
 * Algorithm:
 * 1. Fetch active contractors (filter by trade if specified)
 * 2. Fetch availability for date/block
 * 3. Filter to available contractors only
 * 4. Calculate distance from job location
 * 5. Filter by service radius
 * 6. Calculate combined score
 * 7. Sort by score (highest first)
 */
export async function getContractorRecommendations(
  jobDate: Date,
  timeBlock: TimeBlock,
  jobLocation: Address,
  filters?: RecommendationFilters
): Promise<ContractorRecommendation[]> {
  // 1. Fetch active contractors
  let contractorsQuery = query(
    collection(db, 'contractors'),
    where('status', '==', 'active')
  );

  const contractorsSnapshot = await getDocs(contractorsQuery);
  let contractors: Contractor[] = contractorsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Contractor));

  // Filter by trade if specified
  if (filters?.tradeFilter && filters.tradeFilter.length > 0) {
    contractors = contractors.filter(c =>
      c.trades.some(t => filters.tradeFilter!.includes(t))
    );
  }

  if (contractors.length === 0) {
    return [];
  }

  // 2. Fetch availability for all contractors
  const contractorIds = contractors.map(c => c.id);
  const availabilityMap = await getContractorsBlockAvailability(
    contractorIds,
    jobDate,
    timeBlock
  );

  // 3. Build recommendations with scores
  const recommendations: ContractorRecommendation[] = [];

  for (const contractor of contractors) {
    // Get availability status
    const availabilityStatus = availabilityMap.get(contractor.id) || 'available';

    // Filter out non-available if required
    if (filters?.onlyAvailable && availabilityStatus !== 'available') {
      continue;
    }

    // Calculate distance
    const distance = calculateAddressDistance(contractor.address, jobLocation);

    // Skip if we can't calculate distance (missing coordinates)
    if (distance === null) {
      continue;
    }

    // Check service radius
    const serviceRadius = contractor.serviceRadius || DEFAULT_SERVICE_RADIUS_MILES;
    const withinRadius = isWithinServiceRadius(distance, serviceRadius);

    // Apply distance filter
    if (filters?.maxDistance && distance > filters.maxDistance) {
      continue;
    }

    // Get rating
    const rating = contractor.rating?.overall || 3;

    // Apply rating filter
    if (filters?.minRating && rating < filters.minRating) {
      continue;
    }

    // Calculate scores
    const availabilityScore = calculateAvailabilityScore(availabilityStatus);
    const distanceScoreValue = getDistanceScore(distance, serviceRadius);
    const ratingScore = calculateRatingScore(rating);

    // Calculate weighted combined score
    const combinedScore =
      availabilityScore * RECOMMENDATION_WEIGHTS.availability +
      distanceScoreValue * RECOMMENDATION_WEIGHTS.distance +
      ratingScore * RECOMMENDATION_WEIGHTS.rating;

    recommendations.push({
      contractorId: contractor.id,
      contractor,
      score: Math.round(combinedScore),
      distance,
      rating,
      availabilityStatus,
      isWithinServiceRadius: withinRadius,
      breakdown: {
        availabilityScore: Math.round(availabilityScore * RECOMMENDATION_WEIGHTS.availability),
        distanceScore: Math.round(distanceScoreValue * RECOMMENDATION_WEIGHTS.distance),
        ratingScore: Math.round(ratingScore * RECOMMENDATION_WEIGHTS.rating),
      },
    });
  }

  // 4. Sort by score (highest first)
  recommendations.sort((a, b) => b.score - a.score);

  return recommendations;
}

/**
 * Calculate availability score (0-100)
 * - available = 100
 * - busy = 50
 * - unavailable/on_leave = 0
 */
function calculateAvailabilityScore(status: AvailabilityStatus): number {
  switch (status) {
    case 'available':
      return 100;
    case 'busy':
      return 50;
    case 'unavailable':
    case 'on_leave':
    default:
      return 0;
  }
}

/**
 * Calculate rating score (0-100)
 * Rating is 1-5, so multiply by 20
 */
function calculateRatingScore(rating: number): number {
  return Math.min(100, Math.max(0, rating * 20));
}

/**
 * Get available contractors for a specific date and time block
 * Simplified version that only returns available contractors
 */
export async function getAvailableContractors(
  jobDate: Date,
  timeBlock: TimeBlock,
  jobLocation?: Address,
  requiredTrades?: Trade[]
): Promise<Contractor[]> {
  const recommendations = await getContractorRecommendations(
    jobDate,
    timeBlock,
    jobLocation || { street: '', city: '', state: '', zip: '' },
    {
      onlyAvailable: true,
      tradeFilter: requiredTrades,
    }
  );

  return recommendations.map(r => r.contractor);
}

/**
 * Get top N recommended contractors
 */
export async function getTopContractorRecommendations(
  jobDate: Date,
  timeBlock: TimeBlock,
  jobLocation: Address,
  limit: number = 5,
  filters?: RecommendationFilters
): Promise<ContractorRecommendation[]> {
  const recommendations = await getContractorRecommendations(
    jobDate,
    timeBlock,
    jobLocation,
    filters
  );

  return recommendations.slice(0, limit);
}

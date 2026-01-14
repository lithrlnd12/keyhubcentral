import { Contractor, Address } from './contractor';
import { AvailabilityStatus, TimeBlock } from './availability';

// Recommendation scoring weights
export const RECOMMENDATION_WEIGHTS = {
  availability: 0.40, // Must be available
  distance: 0.35,     // Closer is better
  rating: 0.25,       // Higher rated preferred
} as const;

// Contractor recommendation with scoring breakdown
export interface ContractorRecommendation {
  contractorId: string;
  contractor: Contractor;
  score: number; // 0-100 combined score
  distance: number; // miles from job
  rating: number; // overall rating (1-5)
  availabilityStatus: AvailabilityStatus;
  isWithinServiceRadius: boolean;
  breakdown: {
    availabilityScore: number; // 0-100 weighted by availability weight
    distanceScore: number;     // 0-100 weighted by distance weight
    ratingScore: number;       // 0-100 weighted by rating weight
  };
}

// Job scheduling request
export interface SchedulingRequest {
  jobDate: Date;
  timeBlock: TimeBlock;
  jobLocation: Address;
  requiredTrades?: string[];
}

// Recommendation filters
export interface RecommendationFilters {
  minRating?: number;      // Minimum overall rating
  maxDistance?: number;    // Maximum distance in miles
  tradeFilter?: string[];  // Only contractors with these trades
  onlyAvailable?: boolean; // Only show fully available contractors
}

// Rating tier badges for display
export type RatingTier = 'elite' | 'pro' | 'standard';

export const RATING_TIERS: Record<RatingTier, { minRating: number; label: string; color: string; bgColor: string }> = {
  elite: { minRating: 4.5, label: 'Elite', color: 'text-gold', bgColor: 'bg-gold/20' },
  pro: { minRating: 3.5, label: 'Pro', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  standard: { minRating: 0, label: 'Standard', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
};

// Get rating tier based on overall rating
export function getRatingTier(rating: number): RatingTier {
  if (rating >= RATING_TIERS.elite.minRating) return 'elite';
  if (rating >= RATING_TIERS.pro.minRating) return 'pro';
  return 'standard';
}

// Get rating tier info
export function getRatingTierInfo(rating: number) {
  const tier = getRatingTier(rating);
  return RATING_TIERS[tier];
}

// Default service radius if contractor hasn't set one
export const DEFAULT_SERVICE_RADIUS_MILES = 30;

import { Rating, RatingTier } from '@/types/contractor';

// Rating weights for overall calculation
export const RATING_WEIGHTS = {
  customer: 0.4, // 40%
  speed: 0.2,    // 20%
  warranty: 0.2, // 20%
  internal: 0.2, // 20%
} as const;

// Calculate overall rating from component ratings
export function calculateOverallRating(rating: Omit<Rating, 'overall'>): number {
  const overall =
    rating.customer * RATING_WEIGHTS.customer +
    rating.speed * RATING_WEIGHTS.speed +
    rating.warranty * RATING_WEIGHTS.warranty +
    rating.internal * RATING_WEIGHTS.internal;

  // Round to 1 decimal place
  return Math.round(overall * 10) / 10;
}

// Create a new rating with recalculated overall
export function createRating(partial: Partial<Omit<Rating, 'overall'>>): Rating {
  const rating = {
    customer: partial.customer ?? 3.0,
    speed: partial.speed ?? 3.0,
    warranty: partial.warranty ?? 3.0,
    internal: partial.internal ?? 3.0,
  };

  return {
    ...rating,
    overall: calculateOverallRating(rating),
  };
}

// Update existing rating and recalculate overall
export function updateRating(current: Rating, updates: Partial<Omit<Rating, 'overall'>>): Rating {
  const updated = {
    customer: updates.customer ?? current.customer,
    speed: updates.speed ?? current.speed,
    warranty: updates.warranty ?? current.warranty,
    internal: updates.internal ?? current.internal,
  };

  return {
    ...updated,
    overall: calculateOverallRating(updated),
  };
}

// Get tier display info
export function getTierInfo(tier: RatingTier): {
  label: string;
  color: string;
  bgColor: string;
  description: string;
} {
  switch (tier) {
    case 'elite':
      return {
        label: 'Elite',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
        description: 'Top performer with 10% commission rate',
      };
    case 'pro':
      return {
        label: 'Pro',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
        description: 'High performer with 9% commission rate',
      };
    case 'standard':
      return {
        label: 'Standard',
        color: 'text-gray-400',
        bgColor: 'bg-gray-500/20',
        description: 'Standard performer with 8% commission rate',
      };
    case 'needs_improvement':
      return {
        label: 'Needs Improvement',
        color: 'text-orange-400',
        bgColor: 'bg-orange-500/20',
        description: 'Below standard - coaching recommended',
      };
    case 'probation':
      return {
        label: 'Probation',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
        description: 'On probation - immediate improvement required',
      };
  }
}

// Rating category descriptions
export const RATING_CATEGORIES = {
  customer: {
    label: 'Customer Satisfaction',
    description: 'Based on customer feedback and reviews',
    weight: '40%',
  },
  speed: {
    label: 'Speed & Timeliness',
    description: 'On-time completion and responsiveness',
    weight: '20%',
  },
  warranty: {
    label: 'Warranty Performance',
    description: 'Quality of work and warranty claims rate',
    weight: '20%',
  },
  internal: {
    label: 'Internal Evaluation',
    description: 'Management assessment and reliability',
    weight: '20%',
  },
} as const;

// Validate rating value (1-5 scale)
export function validateRatingValue(value: number): boolean {
  return value >= 1 && value <= 5;
}

// Get rating level label
export function getRatingLevel(value: number): string {
  if (value >= 4.5) return 'Excellent';
  if (value >= 3.5) return 'Good';
  if (value >= 2.5) return 'Average';
  if (value >= 1.5) return 'Below Average';
  return 'Poor';
}

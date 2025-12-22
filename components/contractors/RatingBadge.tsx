'use client';

import { cn } from '@/lib/utils';
import { getRatingTier, RatingTier } from '@/types/contractor';
import { Star } from 'lucide-react';

interface RatingBadgeProps {
  rating: number;
  showStars?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierConfig: Record<RatingTier, { label: string; bgColor: string; textColor: string }> = {
  elite: { label: 'Elite', bgColor: 'bg-amber-500/20', textColor: 'text-amber-400' },
  pro: { label: 'Pro', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400' },
  standard: { label: 'Standard', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400' },
  needs_improvement: { label: 'Needs Improvement', bgColor: 'bg-orange-500/20', textColor: 'text-orange-400' },
  probation: { label: 'Probation', bgColor: 'bg-red-500/20', textColor: 'text-red-400' },
};

export function RatingBadge({ rating, showStars = true, size = 'md', className }: RatingBadgeProps) {
  const tier = getRatingTier(rating);
  const config = tierConfig[tier];

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        config.bgColor,
        config.textColor,
        sizeClasses[size],
        className
      )}
    >
      {showStars && <Star className={cn(starSizes[size], 'fill-current')} />}
      <span>{rating.toFixed(1)}</span>
      <span className="opacity-75">({config.label})</span>
    </span>
  );
}

interface RatingStarsProps {
  rating: number;
  maxStars?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RatingStars({ rating, maxStars = 5, size = 'md', className }: RatingStarsProps) {
  const starSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const stars = [];
  for (let i = 1; i <= maxStars; i++) {
    const filled = i <= Math.floor(rating);
    const partial = !filled && i === Math.ceil(rating) && rating % 1 !== 0;

    stars.push(
      <Star
        key={i}
        className={cn(
          starSizes[size],
          filled ? 'text-amber-400 fill-current' : partial ? 'text-amber-400' : 'text-gray-600'
        )}
      />
    );
  }

  return <div className={cn('flex items-center gap-0.5', className)}>{stars}</div>;
}

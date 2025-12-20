'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getRatingTier, RatingTier } from '@/types/contractor';

interface RatingDisplayProps {
  rating: number;
  showTier?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const tierLabels: Record<RatingTier, string> = {
  elite: 'Elite',
  pro: 'Pro',
  standard: 'Standard',
  needs_improvement: 'Needs Improvement',
  probation: 'Probation',
};

const tierColors: Record<RatingTier, string> = {
  elite: 'text-brand-gold',
  pro: 'text-blue-400',
  standard: 'text-gray-400',
  needs_improvement: 'text-yellow-500',
  probation: 'text-red-500',
};

const sizeStyles = {
  sm: { star: 'w-3 h-3', text: 'text-xs', gap: 'gap-0.5' },
  md: { star: 'w-4 h-4', text: 'text-sm', gap: 'gap-1' },
  lg: { star: 'w-5 h-5', text: 'text-base', gap: 'gap-1' },
};

export function RatingDisplay({
  rating,
  showTier = false,
  size = 'md',
  className,
}: RatingDisplayProps) {
  const tier = getRatingTier(rating);
  const styles = sizeStyles[size];
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;

  return (
    <div className={cn('flex items-center', styles.gap, className)}>
      <div className={cn('flex items-center', styles.gap)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              styles.star,
              star <= fullStars
                ? 'fill-brand-gold text-brand-gold'
                : star === fullStars + 1 && hasHalfStar
                  ? 'fill-brand-gold/50 text-brand-gold'
                  : 'text-gray-600'
            )}
          />
        ))}
      </div>
      <span className={cn(styles.text, 'text-gray-400')}>
        {rating.toFixed(1)}
      </span>
      {showTier && (
        <span className={cn(styles.text, 'font-medium', tierColors[tier])}>
          {tierLabels[tier]}
        </span>
      )}
    </div>
  );
}

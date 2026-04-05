'use client';

import { cn } from '@/lib/utils';

interface RiskScoreBadgeProps {
  level: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  className?: string;
}

const BADGE_STYLES: Record<RiskScoreBadgeProps['level'], { bg: string; text: string; dot: string }> = {
  low: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    dot: 'bg-green-500',
  },
  medium: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    dot: 'bg-yellow-500',
  },
  high: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    dot: 'bg-orange-500',
  },
  critical: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    dot: 'bg-red-500',
  },
};

const LEVEL_LABEL: Record<RiskScoreBadgeProps['level'], string> = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
  critical: 'Crit',
};

export function RiskScoreBadge({ level, score, className }: RiskScoreBadgeProps) {
  const styles = BADGE_STYLES[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        styles.bg,
        styles.text,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', styles.dot)} />
      {LEVEL_LABEL[level]} {score}
    </span>
  );
}

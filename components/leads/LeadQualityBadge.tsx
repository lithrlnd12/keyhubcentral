'use client';

import { LeadQuality } from '@/types/lead';
import { LEAD_QUALITY_LABELS, LEAD_QUALITY_COLORS } from '@/lib/utils/leads';
import { cn } from '@/lib/utils/cn';
import { Flame, ThermometerSun, Snowflake } from 'lucide-react';

interface LeadQualityBadgeProps {
  quality: LeadQuality;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const QUALITY_ICONS = {
  hot: Flame,
  warm: ThermometerSun,
  cold: Snowflake,
};

export function LeadQualityBadge({
  quality,
  size = 'md',
  showIcon = true,
  className,
}: LeadQualityBadgeProps) {
  const colors = LEAD_QUALITY_COLORS[quality];
  const label = LEAD_QUALITY_LABELS[quality];
  const Icon = QUALITY_ICONS[quality];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        colors.bg,
        colors.text,
        colors.border,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      {label}
    </span>
  );
}

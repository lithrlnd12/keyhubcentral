'use client';

import { cn } from '@/lib/utils';
import { getVarianceDisplay, getVarianceColor, isLowStock } from '@/types/inventory';

interface StockLevelBadgeProps {
  quantity: number;
  parLevel: number;
  showQuantity?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StockLevelBadge({
  quantity,
  parLevel,
  showQuantity = true,
  size = 'md',
}: StockLevelBadgeProps) {
  const variance = quantity - parLevel;
  const lowStock = isLowStock(quantity, parLevel);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className="flex items-center gap-2">
      {showQuantity && (
        <span className={cn(
          'font-medium',
          lowStock ? 'text-red-400' : 'text-white'
        )}>
          {quantity}
        </span>
      )}
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          sizeClasses[size],
          lowStock
            ? 'bg-red-500/20 text-red-400'
            : variance > 0
            ? 'bg-green-500/20 text-green-400'
            : 'bg-gray-500/20 text-gray-400'
        )}
      >
        {getVarianceDisplay(variance)}
      </span>
    </div>
  );
}

interface ParComparisonProps {
  quantity: number;
  parLevel: number;
  className?: string;
}

export function ParComparison({ quantity, parLevel, className }: ParComparisonProps) {
  const variance = quantity - parLevel;
  const percentOfPar = parLevel > 0 ? Math.round((quantity / parLevel) * 100) : 0;
  const lowStock = isLowStock(quantity, parLevel);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {quantity} / {parLevel} par
        </span>
        <span className={getVarianceColor(variance)}>
          {getVarianceDisplay(variance)}
        </span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            lowStock
              ? 'bg-red-500'
              : percentOfPar >= 100
              ? 'bg-green-500'
              : 'bg-yellow-500'
          )}
          style={{ width: `${Math.min(percentOfPar, 100)}%` }}
        />
      </div>
    </div>
  );
}

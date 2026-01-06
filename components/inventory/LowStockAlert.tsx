'use client';

import Link from 'next/link';
import { AlertTriangle, ArrowRight, Package, MapPin } from 'lucide-react';
import { LowStockAlert as LowStockAlertType } from '@/types/inventory';
import { cn } from '@/lib/utils';

interface LowStockAlertProps {
  alert: LowStockAlertType;
  href?: string;
}

export function LowStockAlertItem({ alert, href }: LowStockAlertProps) {
  const content = (
    <div className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="p-1.5 bg-red-500/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <p className="text-white font-medium text-sm">{alert.itemName}</p>
          <p className="text-gray-400 text-xs flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {alert.locationName}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-red-400 font-medium">
          {alert.currentQuantity} / {alert.parLevel}
        </p>
        <p className="text-red-400/70 text-xs">
          Need {alert.shortage} more
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-80 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

interface LowStockAlertBannerProps {
  count: number;
  href?: string;
  className?: string;
}

export function LowStockAlertBanner({
  count,
  href,
  className,
}: LowStockAlertBannerProps) {
  if (count === 0) return null;

  const content = (
    <div
      className={cn(
        'flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-xl',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-red-500/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <p className="text-white font-medium">Low Stock Alert</p>
          <p className="text-red-400 text-sm">
            {count} item{count !== 1 ? 's' : ''} below par level
          </p>
        </div>
      </div>
      {href && (
        <ArrowRight className="h-5 w-5 text-red-400" />
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block hover:opacity-90 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}

interface LowStockAlertListProps {
  alerts: LowStockAlertType[];
  getItemHref?: (alert: LowStockAlertType) => string;
  maxItems?: number;
  showViewAll?: boolean;
  viewAllHref?: string;
}

export function LowStockAlertList({
  alerts,
  getItemHref,
  maxItems = 5,
  showViewAll = false,
  viewAllHref,
}: LowStockAlertListProps) {
  if (alerts.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="p-3 bg-green-500/10 rounded-full w-12 h-12 mx-auto mb-3 flex items-center justify-center">
          <Package className="h-6 w-6 text-green-400" />
        </div>
        <p className="text-gray-400">All items are at or above par level</p>
      </div>
    );
  }

  const displayAlerts = alerts.slice(0, maxItems);
  const remainingCount = alerts.length - maxItems;

  return (
    <div className="space-y-2">
      {displayAlerts.map((alert) => (
        <LowStockAlertItem
          key={`${alert.itemId}-${alert.locationId}`}
          alert={alert}
          href={getItemHref?.(alert)}
        />
      ))}

      {showViewAll && remainingCount > 0 && viewAllHref && (
        <Link
          href={viewAllHref}
          className="block text-center py-2 text-gold text-sm hover:underline"
        >
          View {remainingCount} more alert{remainingCount !== 1 ? 's' : ''}
        </Link>
      )}
    </div>
  );
}

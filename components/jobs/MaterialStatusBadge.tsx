'use client';

import { MaterialStatus } from '@/types/job';
import {
  Clock,
  ShoppingCart,
  Truck,
  Package,
  CheckCircle2,
} from 'lucide-react';

interface MaterialStatusBadgeProps {
  status: MaterialStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG: Record<
  MaterialStatus,
  {
    label: string;
    color: string;
    bgColor: string;
    icon: React.ReactNode;
  }
> = {
  pending: {
    label: 'Pending',
    color: 'text-gray-400',
    bgColor: 'bg-gray-500/20',
    icon: <Clock className="w-3 h-3" />,
  },
  ordered: {
    label: 'Ordered',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    icon: <ShoppingCart className="w-3 h-3" />,
  },
  in_transit: {
    label: 'In Transit',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    icon: <Truck className="w-3 h-3" />,
  },
  arrived: {
    label: 'Arrived',
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    icon: <Package className="w-3 h-3" />,
  },
  collected: {
    label: 'Collected',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
};

export function MaterialStatusBadge({ status, size = 'md' }: MaterialStatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${config.bgColor} ${sizeClasses}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}

export function getMaterialStatusOptions(): { value: MaterialStatus; label: string }[] {
  return [
    { value: 'pending', label: 'Pending' },
    { value: 'ordered', label: 'Ordered' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'arrived', label: 'Arrived' },
    { value: 'collected', label: 'Collected' },
  ];
}

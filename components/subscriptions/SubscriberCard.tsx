'use client';

import Link from 'next/link';
import { Subscription } from '@/types/lead';
import { Card, CardContent } from '@/components/ui/Card';
import { TierBadge } from './TierBadge';
import { StatusBadge } from './StatusBadge';
import { getTierDetails } from '@/lib/utils/subscriptions';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  User,
  DollarSign,
  Users,
  Calendar,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface SubscriberCardProps {
  subscription: Subscription;
  className?: string;
}

export function SubscriberCard({ subscription, className }: SubscriberCardProps) {
  const tierDetails = getTierDetails(subscription.tier);

  return (
    <Link href={`/kd/subscribers/${subscription.id}`}>
      <Card
        className={cn(
          'hover:border-brand-gold/50 transition-colors cursor-pointer',
          className
        )}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-white font-semibold truncate">
                  {subscription.userId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <TierBadge tier={subscription.tier} size="sm" />
                <StatusBadge status={subscription.status} size="sm" />
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700/50">
            <div>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <DollarSign className="w-3.5 h-3.5" />
                Monthly
              </div>
              <p className="text-white font-semibold">{formatCurrency(subscription.monthlyFee)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1 text-sm text-gray-400">
                <Users className="w-3.5 h-3.5" />
                Lead Cap
              </div>
              <p className="text-white font-semibold">{subscription.leadCap}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-1 mt-3 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            Started {formatDate(subscription.startDate.toDate())}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

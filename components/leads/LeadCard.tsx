'use client';

import Link from 'next/link';
import { Lead } from '@/types/lead';
import { Card, CardContent } from '@/components/ui/Card';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadQualityBadge } from './LeadQualityBadge';
import { LeadSourceBadge } from './LeadSourceBadge';
import { canReturnLead, getReturnWindowRemaining } from '@/lib/utils/leads';
import { formatDistanceToNow } from '@/lib/utils/formatters';
import {
  User,
  MapPin,
  Mail,
  Clock,
  Wrench,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { PhoneLink } from '@/components/ui/PhoneLink';

interface LeadCardProps {
  lead: Lead;
  showDetails?: boolean;
  className?: string;
}

export function LeadCard({ lead, showDetails = true, className }: LeadCardProps) {
  const canReturn = canReturnLead(lead);
  const returnWindow = getReturnWindowRemaining(lead);

  return (
    <Link href={`/kd/leads/${lead.id}`}>
      <Card
        className={cn(
          'hover:border-brand-gold/50 transition-colors cursor-pointer',
          lead.quality === 'hot' && 'border-red-500/30',
          className
        )}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <LeadQualityBadge quality={lead.quality} size="sm" />
              <div className="min-w-0">
                <span className="text-white font-semibold truncate block">
                  {lead.customer.name}
                </span>
                <span className="text-gray-400 text-sm">{lead.trade}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <LeadStatusBadge status={lead.status} size="sm" />
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-400 truncate">
                {lead.customer.address.city}, {lead.customer.address.state}
              </span>
            </div>
            {showDetails && lead.customer.phone && (
              <div className="flex items-center gap-2 text-sm">
                <PhoneLink phone={lead.customer.phone} showIcon iconClassName="text-gray-500" />
              </div>
            )}
            {showDetails && lead.customer.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-400 truncate">{lead.customer.email}</span>
              </div>
            )}
          </div>

          {/* Details */}
          {showDetails && (
            <div className="flex items-center justify-between gap-4 pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-3">
                {/* Source */}
                <LeadSourceBadge source={lead.source} size="sm" />

                {/* Market */}
                {lead.market && (
                  <div className="flex items-center gap-1.5 text-sm">
                    <Wrench className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-400 text-xs">{lead.market}</span>
                  </div>
                )}
              </div>

              {/* Time / Return Window */}
              <div className="flex items-center gap-1.5 text-sm">
                {canReturn && returnWindow !== null ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-yellow-400 text-xs">
                      {Math.round(returnWindow)}h left
                    </span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-500 text-xs">
                      {lead.createdAt
                        ? formatDistanceToNow(lead.createdAt.toDate())
                        : 'Unknown'}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

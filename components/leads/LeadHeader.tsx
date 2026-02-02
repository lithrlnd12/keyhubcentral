'use client';

import { Lead } from '@/types/lead';
import { LeadStatusBadge } from './LeadStatusBadge';
import { LeadQualityBadge } from './LeadQualityBadge';
import { LeadSourceBadge } from './LeadSourceBadge';
import { Button } from '@/components/ui/Button';
import { canReturnLead, getReturnWindowRemaining } from '@/lib/utils/leads';
import { ArrowLeft, Edit, RotateCcw, CheckCircle, XCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface LeadHeaderProps {
  lead: Lead;
  onReturn?: () => void;
  onConvert?: () => void;
  onMarkLost?: () => void;
  onClaim?: () => void;
  canEdit?: boolean;
  canClaim?: boolean;
  claimLoading?: boolean;
  className?: string;
}

export function LeadHeader({
  lead,
  onReturn,
  onConvert,
  onMarkLost,
  onClaim,
  canEdit = false,
  canClaim = false,
  claimLoading = false,
  className,
}: LeadHeaderProps) {
  const canReturn = canReturnLead(lead);
  const returnWindow = getReturnWindowRemaining(lead);
  const isActionable = !['converted', 'lost', 'returned'].includes(lead.status);

  return (
    <div className={className}>
      {/* Back Link */}
      <Link
        href="/kd"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Leads
      </Link>

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2">
          {/* Customer Name */}
          <h1 className="text-2xl font-bold text-white">{lead.customer.name}</h1>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <LeadQualityBadge quality={lead.quality} />
            <LeadStatusBadge status={lead.status} />
            <LeadSourceBadge source={lead.source} />
          </div>

          {/* Trade & Market */}
          <p className="text-gray-400">
            {lead.trade}
            {lead.market && ` • ${lead.market}`}
          </p>

          {/* Return Window */}
          {canReturn && returnWindow !== null && (
            <p className="text-sm text-yellow-400">
              Return window: {Math.round(returnWindow)}h remaining
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {canClaim && onClaim && (
            <Button size="sm" onClick={onClaim} disabled={claimLoading}>
              <UserPlus className="w-4 h-4 mr-2" />
              {claimLoading ? 'Claiming...' : 'Claim Lead'}
            </Button>
          )}

          {canReturn && onReturn && (
            <Button variant="outline" size="sm" onClick={onReturn}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Return Lead
            </Button>
          )}

          {isActionable && onConvert && lead.status !== 'new' && (
            <Button variant="outline" size="sm" onClick={onConvert}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Convert
            </Button>
          )}

          {isActionable && onMarkLost && (
            <Button variant="ghost" size="sm" onClick={onMarkLost}>
              <XCircle className="w-4 h-4 mr-2" />
              Mark Lost
            </Button>
          )}

          {canEdit && (
            <Link href={`/kd/leads/${lead.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

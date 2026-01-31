'use client';

import Link from 'next/link';
import { Phone, Clock, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { InboundCall } from '@/types/inboundCall';
import { InboundCallStatusBadge } from './InboundCallStatusBadge';
import { InboundCallUrgencyBadge } from './InboundCallUrgencyBadge';
import { formatDuration, formatPhoneNumber, PRIMARY_CONCERN_LABELS } from '@/lib/utils/inboundCalls';

interface InboundCallCardProps {
  call: InboundCall;
  className?: string;
}

export function InboundCallCard({ call, className }: InboundCallCardProps) {
  const callerDisplay = call.caller.name || formatPhoneNumber(call.caller.phone);
  const createdAt = call.createdAt?.toDate?.() || new Date();

  return (
    <Link
      href={`/kts/calls/${call.id}`}
      className={cn(
        'block bg-brand-charcoal rounded-xl p-4 border border-gray-800',
        'hover:border-brand-gold/50 transition-colors',
        call.status === 'new' && 'border-blue-500/30',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-white font-medium truncate">{callerDisplay}</h3>
            <InboundCallStatusBadge status={call.status} />
            <InboundCallUrgencyBadge urgency={call.analysis.urgency} />
          </div>

          <div className="flex items-center gap-1 mt-1 text-sm text-gray-400">
            <Phone className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {formatPhoneNumber(call.caller.phone)}
            </span>
          </div>

          {call.analysis.projectType && (
            <div className="flex items-center gap-1 mt-1 text-sm text-gray-400">
              <FileText className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{call.analysis.projectType}</span>
            </div>
          )}

          <div className="flex items-center gap-1 mt-1 text-sm text-gray-400">
            <Clock className="w-3 h-3 flex-shrink-0" />
            <span>
              {formatDuration(call.duration)} - {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Summary preview */}
      {call.summary && (
        <p className="mt-3 text-sm text-gray-400 line-clamp-2">
          {call.summary}
        </p>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mt-3">
        {call.analysis.primaryConcern && (
          <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
            {PRIMARY_CONCERN_LABELS[call.analysis.primaryConcern]}
          </span>
        )}
        {call.analysis.timeline && (
          <span className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400">
            {call.analysis.timeline}
          </span>
        )}
        {call.recordingUrl && (
          <span className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-400">
            Recording
          </span>
        )}
      </div>
    </Link>
  );
}

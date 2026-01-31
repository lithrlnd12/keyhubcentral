'use client';

import { Phone, Clock, FileText, MessageSquare, AlertCircle, Calendar, User } from 'lucide-react';
import { InboundCall } from '@/types/inboundCall';
import { InboundCallStatusBadge } from './InboundCallStatusBadge';
import { InboundCallUrgencyBadge } from './InboundCallUrgencyBadge';
import {
  formatDuration,
  formatPhoneNumber,
  PRIMARY_CONCERN_LABELS,
  EMOTIONAL_SIGNAL_CONFIG,
  CLOSED_REASON_LABELS,
} from '@/lib/utils/inboundCalls';

interface InboundCallDetailProps {
  call: InboundCall;
}

export function InboundCallDetail({ call }: InboundCallDetailProps) {
  const createdAt = call.createdAt?.toDate?.() || new Date();
  const reviewedAt = call.reviewedAt?.toDate?.();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-brand-charcoal rounded-xl p-4 border border-gray-800">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <h2 className="text-xl font-bold text-white">
                {call.caller.name || 'Unknown Caller'}
              </h2>
              <InboundCallStatusBadge status={call.status} />
              <InboundCallUrgencyBadge urgency={call.analysis.urgency} />
            </div>
            <div className="flex items-center gap-4 text-gray-400 text-sm">
              <span className="flex items-center gap-1">
                <Phone className="w-4 h-4" />
                {formatPhoneNumber(call.caller.phone)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDuration(call.duration)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {createdAt.toLocaleDateString()} {createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>

        {/* Closed reason if applicable */}
        {call.status === 'closed' && call.closedReason && (
          <div className="mt-3 p-2 bg-gray-800/50 rounded text-sm text-gray-400">
            Closed: {CLOSED_REASON_LABELS[call.closedReason]}
          </div>
        )}

        {/* Reviewed info */}
        {reviewedAt && call.reviewedBy && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
            <User className="w-4 h-4" />
            <span>
              Reviewed on {reviewedAt.toLocaleDateString()} at{' '}
              {reviewedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Linked lead */}
        {call.linkedLeadId && (
          <div className="mt-3 p-2 bg-green-500/10 border border-green-500/30 rounded text-sm text-green-400">
            Converted to lead: {call.linkedLeadId}
          </div>
        )}
      </div>

      {/* AI Analysis */}
      <div className="bg-brand-charcoal rounded-xl p-4 border border-gray-800">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-brand-gold" />
          AI Analysis
        </h3>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Project Type */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Project Type</label>
            <p className="text-white mt-1">
              {call.analysis.projectType || <span className="text-gray-500">Not specified</span>}
            </p>
          </div>

          {/* Primary Concern */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Primary Concern</label>
            <p className="text-white mt-1">
              {call.analysis.primaryConcern ? (
                PRIMARY_CONCERN_LABELS[call.analysis.primaryConcern]
              ) : (
                <span className="text-gray-500">Not specified</span>
              )}
            </p>
          </div>

          {/* Timeline */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Timeline</label>
            <p className="text-white mt-1">
              {call.analysis.timeline || <span className="text-gray-500">Not specified</span>}
            </p>
          </div>

          {/* Emotional Signal */}
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider">Emotional Signal</label>
            <p className="text-white mt-1">
              {call.analysis.emotionalSignal ? (
                <>
                  {EMOTIONAL_SIGNAL_CONFIG[call.analysis.emotionalSignal].emoji}{' '}
                  {EMOTIONAL_SIGNAL_CONFIG[call.analysis.emotionalSignal].label}
                </>
              ) : (
                <span className="text-gray-500">Not detected</span>
              )}
            </p>
          </div>
        </div>

        {/* Notes */}
        {call.analysis.notes && (
          <div className="mt-4">
            <label className="text-xs text-gray-500 uppercase tracking-wider">Notes</label>
            <p className="text-gray-300 mt-1">{call.analysis.notes}</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {call.summary && (
        <div className="bg-brand-charcoal rounded-xl p-4 border border-gray-800">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-gold" />
            Call Summary
          </h3>
          <p className="text-gray-300 whitespace-pre-wrap">{call.summary}</p>
        </div>
      )}

      {/* Recording */}
      {call.recordingUrl && (
        <div className="bg-brand-charcoal rounded-xl p-4 border border-gray-800">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <Phone className="w-4 h-4 text-brand-gold" />
            Recording
          </h3>
          <audio controls className="w-full">
            <source src={call.recordingUrl} type="audio/mpeg" />
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {/* Transcript */}
      {call.transcript && (
        <div className="bg-brand-charcoal rounded-xl p-4 border border-gray-800">
          <h3 className="text-white font-medium mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-brand-gold" />
            Transcript
          </h3>
          <div className="max-h-96 overflow-y-auto">
            <p className="text-gray-300 whitespace-pre-wrap text-sm font-mono">
              {call.transcript}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

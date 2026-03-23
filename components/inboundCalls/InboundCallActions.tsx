'use client';

import { useState } from 'react';
import { Eye, Phone, UserPlus, X, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InboundCall, InboundCallStatus, ClosedReason } from '@/types/inboundCall';
import { useInboundCallMutations } from '@/lib/hooks/useInboundCalls';
import { CLOSED_REASON_LABELS } from '@/lib/utils/inboundCalls';
import { NotifyContractorModal } from './NotifyContractorModal';

interface InboundCallActionsProps {
  call: InboundCall;
  onConvertSuccess?: (leadId: string) => void;
}

export function InboundCallActions({ call, onConvertSuccess }: InboundCallActionsProps) {
  const { markAsReviewed, markAsContacted, closeCall, convertToLead, loading } = useInboundCallMutations();
  const [showCloseOptions, setShowCloseOptions] = useState(false);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifySent, setNotifySent] = useState(false);

  const handleMarkReviewed = async () => {
    try {
      await markAsReviewed(call.id);
    } catch (error) {
      console.error('Failed to mark as reviewed:', error);
    }
  };

  const handleMarkContacted = async () => {
    try {
      await markAsContacted(call.id);
    } catch (error) {
      console.error('Failed to mark as contacted:', error);
    }
  };

  const handleClose = async (reason: ClosedReason) => {
    try {
      await closeCall(call.id, reason);
      setShowCloseOptions(false);
    } catch (error) {
      console.error('Failed to close call:', error);
    }
  };

  const handleConvert = async () => {
    try {
      const leadId = await convertToLead(call.id);
      onConvertSuccess?.(leadId);
    } catch (error) {
      console.error('Failed to convert to lead:', error);
    }
  };

  // Don't show actions for already converted or closed calls
  if (call.status === 'converted' || call.status === 'closed') {
    return null;
  }

  return (
    <>
    <div className="space-y-3">
      {/* Complaint banner */}
      {call.isComplaint && (
        <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          This call was flagged as a complaint.
          {notifySent && <span className="ml-auto text-green-400 font-medium">Contractor notified</span>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {/* Mark as Reviewed - only for new calls */}
        {call.status === 'new' && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkReviewed}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
            Mark Reviewed
          </Button>
        )}

        {/* Mark as Contacted - for new or reviewed calls */}
        {(call.status === 'new' || call.status === 'reviewed') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkContacted}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Phone className="w-4 h-4 mr-2" />}
            Mark Contacted
          </Button>
        )}

        {/* Convert to Lead - for any status except converted/closed */}
        <Button
          variant="primary"
          size="sm"
          onClick={handleConvert}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
          Convert to Lead
        </Button>

        {/* Notify Contractor - complaint calls only */}
        {call.isComplaint && !notifySent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowNotifyModal(true)}
            className="border-red-500/50 text-red-400 hover:border-red-500 hover:bg-red-500/10"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Notify Contractor
          </Button>
        )}

        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowCloseOptions(!showCloseOptions)}
          disabled={loading}
        >
          <X className="w-4 h-4 mr-2" />
          Close
        </Button>
      </div>

      {/* Close reason options */}
      {showCloseOptions && (
        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <p className="text-sm text-gray-400 mb-2">Select close reason:</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(CLOSED_REASON_LABELS) as ClosedReason[]).map((reason) => (
              <Button
                key={reason}
                variant="ghost"
                size="sm"
                onClick={() => handleClose(reason)}
                disabled={loading}
                className="text-gray-300"
              >
                {CLOSED_REASON_LABELS[reason]}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>

    {showNotifyModal && (
      <NotifyContractorModal
        call={call}
        onClose={() => setShowNotifyModal(false)}
        onSent={() => {
          setShowNotifyModal(false);
          setNotifySent(true);
        }}
      />
    )}
    </>
  );
}

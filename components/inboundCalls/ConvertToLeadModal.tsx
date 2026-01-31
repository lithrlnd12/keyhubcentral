'use client';

import { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InboundCall } from '@/types/inboundCall';
import { useInboundCallMutations } from '@/lib/hooks/useInboundCalls';
import { formatPhoneNumber } from '@/lib/utils/inboundCalls';

interface ConvertToLeadModalProps {
  call: InboundCall;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (leadId: string) => void;
}

export function ConvertToLeadModal({ call, isOpen, onClose, onSuccess }: ConvertToLeadModalProps) {
  const { convertToLead, loading, error } = useInboundCallMutations();
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConvert = async () => {
    try {
      setLocalError(null);
      const leadId = await convertToLead(call.id);
      onSuccess(leadId);
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to convert to lead');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-brand-charcoal border border-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
            <UserPlus className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Convert to Lead</h3>
            <p className="text-sm text-gray-400">Create a new lead from this call</p>
          </div>
        </div>

        {/* Call Summary */}
        <div className="bg-gray-800/50 rounded-lg p-4 mb-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Caller</span>
            <span className="text-white text-sm">
              {call.caller.name || 'Unknown'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400 text-sm">Phone</span>
            <span className="text-white text-sm">
              {formatPhoneNumber(call.caller.phone)}
            </span>
          </div>
          {call.analysis.projectType && (
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Project Type</span>
              <span className="text-white text-sm">{call.analysis.projectType}</span>
            </div>
          )}
        </div>

        <p className="text-gray-400 text-sm mb-4">
          This will create a new lead with the caller&apos;s information. You can then assign it to a sales rep and continue the sales process.
        </p>

        {/* Error message */}
        {(error || localError) && (
          <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error || localError}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="ghost"
            className="flex-1"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            onClick={handleConvert}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Convert
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

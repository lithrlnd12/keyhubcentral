'use client';

import { useState } from 'react';
import { Job, JobStatus } from '@/types/job';
import { Button } from '@/components/ui/Button';
import { JobStatusBadge } from './JobStatusBadge';
import {
  transitionJobStatus,
  getAvailableTransitions,
  getNextPipelineStatus,
} from '@/lib/firebase/jobTransitions';
import { JOB_STATUS_LABELS } from '@/lib/utils/jobs';
import { ChevronRight, ArrowRight, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface StatusTransitionProps {
  job: Job;
  userId: string;
  userRole: string;
  onSuccess?: () => void;
  compact?: boolean;
}

export function StatusTransition({
  job,
  userId,
  userRole,
  onSuccess,
  compact = false,
}: StatusTransitionProps) {
  const [showModal, setShowModal] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<JobStatus | null>(null);

  const availableTransitions = getAvailableTransitions(job.status, userRole);
  const nextStatus = getNextPipelineStatus(job.status);

  const handleQuickAdvance = async () => {
    if (!nextStatus) return;

    setTransitioning(true);
    setError(null);

    const result = await transitionJobStatus(
      job.id,
      job.status,
      nextStatus,
      userId,
      userRole
    );

    setTransitioning(false);

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to update status');
    }
  };

  const handleTransition = async () => {
    if (!selectedStatus) return;

    setTransitioning(true);
    setError(null);

    const result = await transitionJobStatus(
      job.id,
      job.status,
      selectedStatus,
      userId,
      userRole,
      note || undefined
    );

    setTransitioning(false);

    if (result.success) {
      setShowModal(false);
      setNote('');
      setSelectedStatus(null);
      onSuccess?.();
    } else {
      setError(result.error || 'Failed to update status');
    }
  };

  if (availableTransitions.length === 0) {
    return null;
  }

  // Compact mode - just a button
  if (compact && nextStatus) {
    return (
      <Button
        size="sm"
        onClick={handleQuickAdvance}
        disabled={transitioning}
        className="whitespace-nowrap"
      >
        {transitioning ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <ArrowRight className="w-4 h-4 mr-1" />
            {JOB_STATUS_LABELS[nextStatus]}
          </>
        )}
      </Button>
    );
  }

  return (
    <>
      {/* Quick advance button */}
      {nextStatus && (
        <Button
          onClick={handleQuickAdvance}
          disabled={transitioning}
          className="whitespace-nowrap"
        >
          {transitioning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Updating...
            </>
          ) : (
            <>
              Move to {JOB_STATUS_LABELS[nextStatus]}
              <ChevronRight className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      )}

      {/* More options button */}
      {availableTransitions.length > 1 && (
        <Button variant="outline" onClick={() => setShowModal(true)}>
          More Options
        </Button>
      )}

      {error && !showModal && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-brand-charcoal border border-gray-700 rounded-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Change Status
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Current status */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Current Status</p>
                <JobStatusBadge status={job.status} size="lg" />
              </div>

              {/* Available transitions */}
              <div>
                <p className="text-sm text-gray-400 mb-2">Move To</p>
                <div className="space-y-2">
                  {availableTransitions.map((status) => (
                    <button
                      key={status}
                      onClick={() => setSelectedStatus(status)}
                      className={cn(
                        'w-full flex items-center justify-between p-3 rounded-lg border transition-colors',
                        selectedStatus === status
                          ? 'bg-brand-gold/20 border-brand-gold/50'
                          : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                      )}
                    >
                      <JobStatusBadge status={status} />
                      {selectedStatus === status && (
                        <span className="text-brand-gold text-sm">Selected</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Note */}
              {selectedStatus && (
                <div>
                  <label className="block text-sm text-gray-400 mb-1">
                    Note (optional)
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50 resize-none"
                    placeholder="Add a note about this status change..."
                  />
                </div>
              )}

              {error && (
                <p className="text-red-400 text-sm">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
              <Button variant="ghost" onClick={() => setShowModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleTransition}
                disabled={!selectedStatus || transitioning}
              >
                {transitioning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

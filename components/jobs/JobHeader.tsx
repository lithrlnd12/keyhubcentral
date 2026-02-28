'use client';

import Link from 'next/link';
import { Job, JobStatus, getNextStatus } from '@/types/job';
import { JobStatusBadge } from './JobStatusBadge';
import { Button } from '@/components/ui/Button';
import {
  formatJobType,
  formatJobDate,
  isJobOverdue,
  JOB_TYPE_ICONS,
  JOB_STATUS_LABELS,
} from '@/lib/utils/jobs';
import { formatPhone, getPhoneHref } from '@/lib/utils/formatters';
import {
  ArrowLeft,
  Edit,
  ChevronRight,
  ChevronLeft,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Navigation,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';
import { getPreviousStatus, transitionJobStatus } from '@/lib/firebase/jobTransitions';

interface JobHeaderProps {
  job: Job;
  canEdit: boolean;
  onUpdate: (data: Partial<Job>) => Promise<void>;
  userId?: string;
  userRole?: string;
}

export function JobHeader({ job, canEdit, onUpdate, userId, userRole }: JobHeaderProps) {
  const [transitioning, setTransitioning] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [rollbackNote, setRollbackNote] = useState('');
  const [rollbackTransitioning, setRollbackTransitioning] = useState(false);
  const [rollbackError, setRollbackError] = useState<string | null>(null);
  const overdue = isJobOverdue(job);
  const nextStatus = getNextStatus(job.status);
  const prevStatus = getPreviousStatus(job.status);
  const canRollback = ['owner', 'admin'].includes(userRole || '') && !!prevStatus;

  const handleAdvanceStatus = async () => {
    if (!nextStatus) return;

    setTransitioning(true);
    try {
      await onUpdate({ status: nextStatus });
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setTransitioning(false);
    }
  };

  const handleRollback = async () => {
    if (!prevStatus || !userId || !userRole || !rollbackNote.trim()) return;

    setRollbackTransitioning(true);
    setRollbackError(null);

    const result = await transitionJobStatus(
      job.id,
      job.status,
      prevStatus,
      userId,
      userRole,
      rollbackNote.trim()
    );

    setRollbackTransitioning(false);

    if (result.success) {
      setShowRollbackModal(false);
      setRollbackNote('');
    } else {
      setRollbackError(result.error || 'Failed to roll back status');
    }
  };

  return (
    <>
    <div className="bg-brand-charcoal rounded-xl border border-gray-800 overflow-hidden">
      {/* Top section */}
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Back button and job info */}
          <div className="flex-1 min-w-0">
            <Link
              href="/kr"
              className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Jobs
            </Link>

            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{JOB_TYPE_ICONS[job.type]}</span>
              <h1 className="text-2xl font-bold text-white">{job.jobNumber}</h1>
              <JobStatusBadge status={job.status} size="lg" />
              {overdue && (
                <span className="flex items-center gap-1 text-red-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Overdue
                </span>
              )}
            </div>

            <p className="text-gray-400">{formatJobType(job.type)} Renovation</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
            {canRollback && (
              <Button
                variant="outline"
                onClick={() => { setShowRollbackModal(true); setRollbackError(null); setRollbackNote(''); }}
                disabled={transitioning || rollbackTransitioning}
                className="whitespace-nowrap text-orange-400 border-orange-400/40 hover:border-orange-400/70 hover:text-orange-300"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Move Back
              </Button>
            )}
            {canEdit && nextStatus && (
              <Button
                onClick={handleAdvanceStatus}
                disabled={transitioning || rollbackTransitioning}
                className="whitespace-nowrap"
              >
                {transitioning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
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
            {canEdit && (
              <Link href={`/kr/${job.id}/edit`}>
                <Button variant="outline">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Customer info bar */}
      <div className="px-6 py-4 bg-gray-800/30 border-t border-gray-700/50">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-500" />
            <span className="text-white font-medium">{job.customer.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-gray-400">
              {job.customer.address.street}, {job.customer.address.city},{' '}
              {job.customer.address.state} {job.customer.address.zip}
            </span>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${job.customer.address.street}, ${job.customer.address.city}, ${job.customer.address.state} ${job.customer.address.zip}`
              )}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-brand-black bg-brand-gold hover:bg-brand-gold-light rounded-lg transition-colors shadow-sm"
              title="Get directions in Google Maps"
            >
              <Navigation className="w-4 h-4" />
              Navigate
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <a
              href={getPhoneHref(job.customer.phone)}
              className="text-brand-gold hover:text-brand-gold-light hover:underline"
            >
              {formatPhone(job.customer.phone)}
            </a>
          </div>
          {job.customer.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-500" />
              <a
                href={`mailto:${job.customer.email}`}
                className="text-gray-400 hover:text-white"
              >
                {job.customer.email}
              </a>
            </div>
          )}
          {job.dates.targetCompletion && (
            <div className="flex items-center gap-2 ml-auto">
              <Calendar className={cn('w-4 h-4', overdue ? 'text-red-400' : 'text-gray-500')} />
              <span className={cn('text-sm', overdue ? 'text-red-400' : 'text-gray-400')}>
                Target: {formatJobDate(job.dates.targetCompletion)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Rollback confirmation modal */}
    {showRollbackModal && prevStatus && (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-brand-charcoal border border-gray-700 rounded-xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Move Job Back
            </h3>
            <button
              onClick={() => setShowRollbackModal(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <div className="flex items-center gap-3">
              <JobStatusBadge status={job.status} size="lg" />
              <ChevronLeft className="w-5 h-5 text-gray-500" />
              <JobStatusBadge status={prevStatus} size="lg" />
            </div>

            <p className="text-sm text-gray-400">
              This will move the job back to <span className="text-white font-medium">{JOB_STATUS_LABELS[prevStatus]}</span>.
              A reason is required.
            </p>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Reason <span className="text-red-400">*</span>
              </label>
              <textarea
                value={rollbackNote}
                onChange={(e) => setRollbackNote(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-400/50 resize-none"
                placeholder="Why is this job being moved back?"
                autoFocus
              />
            </div>

            {rollbackError && (
              <p className="text-red-400 text-sm">{rollbackError}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 p-4 border-t border-gray-700">
            <Button variant="ghost" onClick={() => setShowRollbackModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRollback}
              disabled={!rollbackNote.trim() || rollbackTransitioning}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              {rollbackTransitioning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Moving Back...
                </>
              ) : (
                'Confirm Rollback'
              )}
            </Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

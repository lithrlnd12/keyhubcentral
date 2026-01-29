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
import {
  ArrowLeft,
  Edit,
  ChevronRight,
  User,
  MapPin,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { useState } from 'react';

interface JobHeaderProps {
  job: Job;
  canEdit: boolean;
  onUpdate: (data: Partial<Job>) => Promise<void>;
}

export function JobHeader({ job, canEdit, onUpdate }: JobHeaderProps) {
  const [transitioning, setTransitioning] = useState(false);
  const overdue = isJobOverdue(job);
  const nextStatus = getNextStatus(job.status);

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

  return (
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
          <div className="flex gap-2 flex-shrink-0">
            {canEdit && nextStatus && (
              <Button
                onClick={handleAdvanceStatus}
                disabled={transitioning}
                className="whitespace-nowrap"
              >
                {transitioning ? (
                  'Updating...'
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
              href={`tel:${job.customer.phone}`}
              className="text-gray-400 hover:text-white"
            >
              {job.customer.phone}
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
  );
}

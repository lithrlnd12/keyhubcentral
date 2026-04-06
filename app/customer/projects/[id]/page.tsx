'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  FileText,
  Wrench,
  Loader2,
  ShieldAlert,
  Clock,
  Download,
} from 'lucide-react';
import { useAuth } from '@/lib/hooks';
import { subscribeToCustomerJob } from '@/lib/firebase/customerAccess';
import { Job, JOB_STATUS_ORDER } from '@/types/job';
import { JobProgressTracker } from '@/components/customer/JobProgressTracker';
import { InstallerCard } from '@/components/customer/InstallerCard';
import { CustomerPhotoGallery } from '@/components/customer/CustomerPhotoGallery';
import { ServiceRequestForm } from '@/components/customer/ServiceRequestForm';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<string, string> = {
  lead: 'Lead',
  sold: 'Sold',
  front_end_hold: 'Front End Hold',
  production: 'In Production',
  scheduled: 'Scheduled',
  started: 'In Progress',
  complete: 'Complete',
  paid_in_full: 'Paid in Full',
};

const JOB_TYPE_LABELS: Record<string, string> = {
  bathroom: 'Bathroom Renovation',
  kitchen: 'Kitchen Renovation',
  exterior: 'Exterior Work',
  other: 'Renovation',
};

function formatTimestamp(ts: any): string {
  if (!ts) return '--';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CustomerProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [showServiceForm, setShowServiceForm] = useState(false);

  const jobId = params.id as string;

  useEffect(() => {
    if (authLoading || !user) return;

    const customerEmail = user.email;
    if (!customerEmail) {
      setAccessDenied(true);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToCustomerJob(
      jobId,
      customerEmail,
      (jobData) => {
        if (jobData) {
          setJob(jobData);
          setAccessDenied(false);
        } else {
          setAccessDenied(true);
        }
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [jobId, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (accessDenied || !job) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Project Not Found
        </h2>
        <p className="text-gray-500 text-sm max-w-sm mb-6">
          This project doesn&apos;t exist or you don&apos;t have permission to view it.
        </p>
        <Link
          href="/customer/projects"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  const hasPhotos =
    (job.photos?.before && job.photos.before.length > 0) ||
    (job.photos?.after && job.photos.after.length > 0);
  const hasDocuments =
    job.documents?.signedContracts?.remodelingAgreement ||
    job.documents?.signedContracts?.disclosureStatement ||
    job.documents?.completionCert;
  const hasCrew = job.crewIds && job.crewIds.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Back button */}
      <Link
        href="/customer/projects"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Projects
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">
                {JOB_TYPE_LABELS[job.type] || 'Project'}
              </h1>
              <span
                className={cn(
                  'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                  job.status === 'complete' || job.status === 'paid_in_full'
                    ? 'bg-green-100 text-green-700'
                    : job.status === 'started'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
                )}
              >
                {STATUS_LABELS[job.status] || job.status}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              Job #{job.jobNumber}
            </p>
            {job.customer.address && (
              <div className="flex items-center gap-1.5 mt-2 text-sm text-gray-500">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>
                  {job.customer.address.street}, {job.customer.address.city},{' '}
                  {job.customer.address.state} {job.customer.address.zip}
                </span>
              </div>
            )}
          </div>

          {/* Service Request button */}
          {(job.status === 'complete' || job.status === 'paid_in_full') && (
            <button
              onClick={() => setShowServiceForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Wrench className="w-4 h-4" />
              Request Service
            </button>
          )}
        </div>
      </div>

      {/* Progress Tracker */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">
          Project Progress
        </h2>
        <JobProgressTracker
          currentStatus={job.status}
          dates={job.dates}
        />
      </div>

      {/* Key Dates */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Key Dates
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              label: 'Sold Date',
              value: formatTimestamp(job.dates.sold),
              icon: Calendar,
            },
            {
              label: 'Scheduled Start',
              value: formatTimestamp(job.dates.scheduledStart),
              icon: Clock,
            },
            {
              label: 'Estimated Completion',
              value: formatTimestamp(job.dates.targetCompletion),
              icon: Calendar,
            },
            {
              label: 'Actual Start',
              value: formatTimestamp(job.dates.actualStart),
              icon: Calendar,
              hide: !job.dates.actualStart,
            },
            {
              label: 'Completed',
              value: formatTimestamp(job.dates.actualCompletion),
              icon: Calendar,
              hide: !job.dates.actualCompletion,
            },
          ]
            .filter((d) => !d.hide)
            .map((dateItem) => (
              <div
                key={dateItem.label}
                className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <dateItem.icon className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{dateItem.label}</p>
                  <p className="text-sm font-medium text-gray-900">
                    {dateItem.value}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Assigned Crew */}
      {hasCrew && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Your Installer
          </h2>
          <div className="space-y-3">
            {job.crewIds.map((crewId) => (
              <InstallerCard key={crewId} contractorId={crewId} />
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          Project Photos
        </h2>
        <CustomerPhotoGallery
          photos={[]}
          beforePhotos={job.photos?.before}
          afterPhotos={job.photos?.after}
        />
      </div>

      {/* Documents */}
      {hasDocuments && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Documents
          </h2>
          <div className="space-y-2">
            {job.documents?.signedContracts?.remodelingAgreement && (
              <a
                href={job.documents.signedContracts.remodelingAgreement.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Remodeling Agreement
                  </p>
                  <p className="text-xs text-gray-500">
                    Signed{' '}
                    {formatTimestamp(
                      job.documents.signedContracts.remodelingAgreement.signedAt
                    )}
                  </p>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
            )}

            {job.documents?.signedContracts?.disclosureStatement && (
              <a
                href={job.documents.signedContracts.disclosureStatement.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Disclosure Statement
                  </p>
                  <p className="text-xs text-gray-500">
                    Signed{' '}
                    {formatTimestamp(
                      job.documents.signedContracts.disclosureStatement.signedAt
                    )}
                  </p>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
            )}

            {job.documents?.completionCert?.pdfUrl && (
              <a
                href={job.documents.completionCert.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    Completion Certificate
                  </p>
                  <p className="text-xs text-gray-500">
                    Signed{' '}
                    {formatTimestamp(job.documents.completionCert.signedAt)}
                  </p>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Warranty info */}
      {job.warranty && job.warranty.status !== 'pending' && (
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Warranty
          </h2>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <div
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0',
                job.warranty.status === 'active'
                  ? 'bg-green-100'
                  : 'bg-gray-200'
              )}
            >
              <ShieldAlert
                className={cn(
                  'w-4 h-4',
                  job.warranty.status === 'active'
                    ? 'text-green-600'
                    : 'text-gray-500'
                )}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {job.warranty.status === 'active'
                  ? 'Warranty Active'
                  : 'Warranty Expired'}
              </p>
              {job.warranty.endDate && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {job.warranty.status === 'active' ? 'Expires' : 'Expired'}{' '}
                  {formatTimestamp(job.warranty.endDate)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Service Request Modal Overlay */}
      {showServiceForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <ServiceRequestForm
              jobId={job.id}
              customerEmail={user?.email || ''}
              onClose={() => setShowServiceForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

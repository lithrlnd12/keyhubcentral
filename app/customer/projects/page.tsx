'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Briefcase,
  Loader2,
  Clock,
  CheckCircle,
  User,
  MessageSquare,
  MapPin,
  Calendar,
  ChevronRight,
  Hammer,
  HardHat,
} from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/hooks';
import { Lead } from '@/types/lead';
import { Job, JobStatus } from '@/types/job';
import { subscribeToCustomerJobs } from '@/lib/firebase/customerAccess';
import { cn } from '@/lib/utils';

// Job status display mapping (light theme)
const JOB_STATUS_CONFIG: Record<
  JobStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  lead: { label: 'Lead', bgColor: 'bg-gray-100', textColor: 'text-gray-600' },
  sold: { label: 'Sold', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  front_end_hold: {
    label: 'Front End Hold',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  production: {
    label: 'In Production',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-700',
  },
  scheduled: {
    label: 'Scheduled',
    bgColor: 'bg-indigo-100',
    textColor: 'text-indigo-700',
  },
  started: {
    label: 'In Progress',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  complete: {
    label: 'Complete',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
  paid_in_full: {
    label: 'Paid in Full',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
  },
};

const JOB_TYPE_LABELS: Record<string, string> = {
  bathroom: 'Bathroom',
  kitchen: 'Kitchen',
  exterior: 'Exterior',
  other: 'Other',
};

// Lead status display (same as before)
function getLeadStatusDisplay(status: string) {
  switch (status) {
    case 'new':
      return { label: 'Searching for a pro...', variant: 'warning' as const, icon: Clock };
    case 'assigned':
      return { label: 'Pro matched!', variant: 'success' as const, icon: CheckCircle };
    case 'contacted':
      return { label: 'In progress', variant: 'info' as const, icon: MessageSquare };
    case 'qualified':
      return { label: 'Quote pending', variant: 'info' as const, icon: Clock };
    case 'converted':
      return { label: 'Project started', variant: 'success' as const, icon: CheckCircle };
    case 'lost':
    case 'returned':
      return { label: 'Closed', variant: 'default' as const, icon: Briefcase };
    default:
      return { label: status, variant: 'default' as const, icon: Clock };
  }
}

function formatTimestamp(ts: any): string {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function CustomerProjectsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [leads, setLeads] = useState<(Lead & { contractorName?: string })[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingLeads, setLoadingLeads] = useState(true);

  // Subscribe to jobs in real-time
  useEffect(() => {
    if (!user?.email) {
      setLoadingJobs(false);
      return;
    }

    const unsubscribe = subscribeToCustomerJobs(user.email, (jobsData) => {
      setJobs(jobsData);
      setLoadingJobs(false);
    });

    return () => unsubscribe();
  }, [user?.email]);

  // Load leads (one-time fetch, same as before)
  useEffect(() => {
    async function loadLeads() {
      if (!user?.uid) return;
      try {
        const q = query(
          collection(db, 'leads'),
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const leadsData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead));

        const enriched = await Promise.all(
          leadsData.map(async (lead) => {
            if (lead.assignedTo && ['assigned', 'contacted', 'qualified'].includes(lead.status)) {
              try {
                const contractorQuery = query(
                  collection(db, 'contractors'),
                  where('userId', '==', lead.assignedTo)
                );
                const contractorSnap = await getDocs(contractorQuery);
                const contractorName = contractorSnap.docs[0]?.data()?.businessName;
                return { ...lead, contractorName };
              } catch {
                return lead;
              }
            }
            return lead;
          })
        );

        setLeads(enriched);
      } catch (err) {
        console.error('Error loading customer leads:', err);
      } finally {
        setLoadingLeads(false);
      }
    }
    loadLeads();
  }, [user?.uid]);

  const loading = loadingJobs || loadingLeads;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  const hasJobs = jobs.length > 0;
  const hasLeads = leads.length > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Projects</h1>
        <Link
          href="/customer/book"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Book a Pro
        </Link>
      </div>

      {/* Jobs Section */}
      {hasJobs && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <HardHat className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Active Projects
            </h2>
          </div>
          <div className="space-y-3">
            {jobs.map((job) => {
              const statusConfig = JOB_STATUS_CONFIG[job.status];
              return (
                <Link key={job.id} href={`/customer/projects/${job.id}`}>
                  <div className="bg-white border border-gray-200 rounded-xl p-4 md:p-5 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer group">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Job number and type */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-base font-semibold text-gray-900">
                            {JOB_TYPE_LABELS[job.type] || 'Renovation'} - #{job.jobNumber}
                          </span>
                          <span
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                              statusConfig.bgColor,
                              statusConfig.textColor
                            )}
                          >
                            {statusConfig.label}
                          </span>
                        </div>

                        {/* Address */}
                        {job.customer.address && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                            <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">
                              {job.customer.address.street},{' '}
                              {job.customer.address.city},{' '}
                              {job.customer.address.state}
                            </span>
                          </div>
                        )}

                        {/* Key dates */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {job.dates.sold && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="w-3 h-3" />
                              <span>
                                Sold: {formatTimestamp(job.dates.sold)}
                              </span>
                            </div>
                          )}
                          {job.dates.scheduledStart && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>
                                Start:{' '}
                                {formatTimestamp(job.dates.scheduledStart)}
                              </span>
                            </div>
                          )}
                          {job.dates.targetCompletion && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="w-3 h-3" />
                              <span>
                                Est. Complete:{' '}
                                {formatTimestamp(job.dates.targetCompletion)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Leads / Service Requests Section */}
      {hasLeads && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-gray-700" />
            <h2 className="text-lg font-semibold text-gray-900">
              Service Requests
            </h2>
          </div>
          <div className="space-y-3">
            {leads.map((lead) => {
              const status = getLeadStatusDisplay(lead.status);
              const StatusIcon = status.icon;
              const createdAt = lead.createdAt?.toDate?.();

              return (
                <div
                  key={lead.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 md:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Specialties */}
                      {lead.specialties && lead.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {lead.specialties.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Description */}
                      {lead.customer?.notes && (
                        <p className="text-gray-700 text-sm mb-2 line-clamp-2">
                          {lead.customer.notes}
                        </p>
                      )}

                      {/* Status */}
                      <div className="flex items-center gap-2 mb-2">
                        <StatusIcon
                          className={cn(
                            'w-4 h-4',
                            status.variant === 'success' && 'text-green-500',
                            status.variant === 'warning' && 'text-yellow-500',
                            status.variant === 'info' && 'text-blue-500',
                            status.variant === 'default' && 'text-gray-400'
                          )}
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            status.variant === 'success' && 'text-green-600',
                            status.variant === 'warning' && 'text-yellow-600',
                            status.variant === 'info' && 'text-blue-600',
                            status.variant === 'default' && 'text-gray-500'
                          )}
                        >
                          {status.label}
                        </span>
                      </div>

                      {/* Contractor Name */}
                      {lead.contractorName && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <User className="w-3.5 h-3.5" />
                          <span>{lead.contractorName}</span>
                        </div>
                      )}

                      {/* Date */}
                      {createdAt && (
                        <p className="text-xs text-gray-400 mt-2">
                          Submitted {createdAt.toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!hasJobs && !hasLeads && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No projects yet
          </h3>
          <p className="text-gray-500 text-sm mb-4 max-w-sm mx-auto">
            Once you book a service, your projects will appear here with
            real-time status updates.
          </p>
          <Link
            href="/customer/book"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Book a Pro
          </Link>
        </div>
      )}
    </div>
  );
}

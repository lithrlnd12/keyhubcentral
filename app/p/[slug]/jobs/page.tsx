'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useAuth } from '@/lib/hooks';
import { useCustomerJobs } from '@/lib/hooks/useCustomerPortal';
import { TenantHeader } from '@/components/portal-wl/TenantHeader';
import { JobProgressTracker } from '@/components/portal-wl/JobProgressTracker';
import { CUSTOMER_STATUS_MAP } from '@/types/tenant-portal';
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useState } from 'react';

type FilterType = 'all' | 'active' | 'completed';

export default function TenantJobsList() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { user, loading: authLoading, signOut } = useAuth();
  const { jobs, loading: jobsLoading } = useCustomerJobs(
    user?.email || null,
    tenant.ownerId
  );
  const [filter, setFilter] = useState<FilterType>('all');

  const primaryColor = tenant.branding.primaryColor;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/p/${tenant.slug}`);
    }
  }, [user, authLoading, router, tenant.slug]);

  const handleSignOut = async () => {
    await signOut();
    router.push(`/p/${tenant.slug}`);
  };

  const filteredJobs = jobs.filter((job) => {
    if (filter === 'active') return !['complete', 'paid_in_full'].includes(job.status);
    if (filter === 'completed') return ['complete', 'paid_in_full'].includes(job.status);
    return true;
  });

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
      <TenantHeader tenant={tenant} customerName={user.displayName} onSignOut={handleSignOut} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Briefcase size={22} style={{ color: primaryColor }} />
            All Projects
          </h1>

          {/* Filter tabs */}
          <div className="flex items-center gap-1 bg-[#2D2D2D] rounded-lg p-1">
            {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize"
                style={{
                  backgroundColor: filter === f ? primaryColor : 'transparent',
                  color: filter === f ? '#fff' : '#9CA3AF',
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {jobsLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: primaryColor }} />
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="bg-[#2D2D2D] rounded-xl p-8 text-center">
            <Filter size={40} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">
              {filter === 'all' ? 'No projects yet.' : `No ${filter} projects.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredJobs.map((job) => {
              const statusInfo = CUSTOMER_STATUS_MAP[job.status];
              const isCompleted = ['complete', 'paid_in_full'].includes(job.status);

              return (
                <button
                  key={job.id}
                  onClick={() => router.push(`/p/${tenant.slug}/jobs/${job.id}`)}
                  className="w-full bg-[#2D2D2D] rounded-xl p-5 border border-gray-700/50 hover:border-gray-600 transition-colors text-left"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-semibold capitalize">{job.type} Project</h3>
                        <span className="text-gray-500 text-sm">#{job.jobNumber}</span>
                      </div>
                      <p className="text-gray-400 text-sm mt-0.5">{job.address}</p>
                    </div>
                    <ChevronRight size={20} className="text-gray-500 mt-1 flex-shrink-0" />
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                      style={{
                        backgroundColor: isCompleted ? '#10B98122' : `${primaryColor}22`,
                        color: isCompleted ? '#10B981' : primaryColor,
                      }}
                    >
                      {job.statusLabel}
                    </span>
                    {job.scheduledStart && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar size={12} />
                        {job.scheduledStart}
                      </span>
                    )}
                  </div>

                  {!isCompleted && (
                    <JobProgressTracker
                      currentStep={job.statusStep}
                      totalSteps={job.totalSteps}
                      primaryColor={primaryColor}
                    />
                  )}

                  {statusInfo && (
                    <p className="text-gray-500 text-sm mt-3">{statusInfo.description}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

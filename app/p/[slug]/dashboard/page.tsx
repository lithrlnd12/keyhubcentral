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
  Briefcase,
  Calendar,
  CalendarPlus,
  Camera,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  FolderOpen,
  MessageCircle,
  Shield,
} from 'lucide-react';

export default function TenantDashboard() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { user, loading: authLoading, signOut } = useAuth();
  const { jobs, loading: jobsLoading } = useCustomerJobs(
    user?.email || null,
    tenant.ownerId
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/p/${tenant.slug}`);
    }
  }, [user, authLoading, router, tenant.slug]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
        <div className="animate-spin h-8 w-8 border-2 border-t-transparent rounded-full" style={{ borderColor: tenant.branding.primaryColor }} />
      </div>
    );
  }

  const activeJobs = jobs.filter((j) => !['complete', 'paid_in_full'].includes(j.status));
  const completedJobs = jobs.filter((j) => ['complete', 'paid_in_full'].includes(j.status));
  const primaryColor = tenant.branding.primaryColor;

  const handleSignOut = async () => {
    await signOut();
    router.push(`/p/${tenant.slug}`);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
      <TenantHeader
        tenant={tenant}
        customerName={user.displayName}
        onSignOut={handleSignOut}
      />

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Welcome + CTA */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Welcome back, {user.displayName?.split(' ')[0] || 'there'}
            </h1>
            <p className="text-gray-400 mt-1">
              Here&apos;s the latest on your projects with {tenant.companyName}.
            </p>
          </div>
          <button
            onClick={() => router.push(`/p/${tenant.slug}/request`)}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-white text-sm whitespace-nowrap transition-all hover:opacity-90"
            style={{ backgroundColor: primaryColor }}
          >
            Get a Quote
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <StatCard
            icon={<Briefcase size={20} />}
            label="Active Projects"
            value={activeJobs.length}
            color={primaryColor}
          />
          <StatCard
            icon={<Clock size={20} />}
            label="Completed"
            value={completedJobs.length}
            color="#10B981"
          />
          <StatCard
            icon={<Camera size={20} />}
            label="Photos"
            value={jobs.reduce((sum, j) => sum + j.photosBefore.length + j.photosAfter.length, 0)}
            color="#6366F1"
          />
          <StatCard
            icon={<Shield size={20} />}
            label="Warranties"
            value={jobs.filter((j) => j.warranty?.status === 'active').length}
            color="#F59E0B"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
          <button
            onClick={() => router.push(`/p/${tenant.slug}/jobs`)}
            className="bg-[#2D2D2D] rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-colors text-center"
          >
            <Briefcase size={22} className="mx-auto mb-2" style={{ color: primaryColor }} />
            <p className="text-white text-sm font-medium">Projects</p>
          </button>
          <button
            onClick={() => router.push(`/p/${tenant.slug}/invoices`)}
            className="bg-[#2D2D2D] rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-colors text-center"
          >
            <DollarSign size={22} className="mx-auto mb-2 text-green-400" />
            <p className="text-white text-sm font-medium">Invoices</p>
          </button>
          <button
            onClick={() => router.push(`/p/${tenant.slug}/messages`)}
            className="bg-[#2D2D2D] rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-colors text-center"
          >
            <MessageCircle size={22} className="mx-auto mb-2 text-blue-400" />
            <p className="text-white text-sm font-medium">Messages</p>
          </button>
          <button
            onClick={() => router.push(`/p/${tenant.slug}/documents`)}
            className="bg-[#2D2D2D] rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-colors text-center"
          >
            <FolderOpen size={22} className="mx-auto mb-2 text-purple-400" />
            <p className="text-white text-sm font-medium">Documents</p>
          </button>
          <button
            onClick={() => router.push(`/p/${tenant.slug}/schedule`)}
            className="bg-[#2D2D2D] rounded-xl p-4 border border-gray-700/50 hover:border-gray-600 transition-colors text-center"
          >
            <CalendarPlus size={22} className="mx-auto mb-2 text-orange-400" />
            <p className="text-white text-sm font-medium">Schedule</p>
          </button>
        </div>

        {/* Active Projects */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Briefcase size={20} style={{ color: primaryColor }} />
            Active Projects
          </h2>

          {jobsLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-6 w-6 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: primaryColor }} />
            </div>
          ) : activeJobs.length === 0 ? (
            <div className="bg-[#2D2D2D] rounded-xl p-8 text-center">
              <Briefcase size={40} className="mx-auto mb-3 text-gray-600" />
              <p className="text-gray-400">No active projects right now.</p>
              <p className="text-gray-500 text-sm mt-1">
                When you start a project with {tenant.companyName}, it&apos;ll show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  primaryColor={primaryColor}
                  onClick={() => router.push(`/p/${tenant.slug}/jobs/${job.id}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Completed Projects */}
        {completedJobs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <FileText size={20} className="text-green-500" />
              Completed Projects
            </h2>
            <div className="space-y-4">
              {completedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  primaryColor={primaryColor}
                  onClick={() => router.push(`/p/${tenant.slug}/jobs/${job.id}`)}
                  completed
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-[#2D2D2D] rounded-xl p-4 border border-gray-700/50">
      <div className="flex items-center gap-2 mb-2" style={{ color }}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  );
}

function JobCard({
  job,
  primaryColor,
  onClick,
  completed,
}: {
  job: import('@/types/tenant-portal').CustomerJobView;
  primaryColor: string;
  onClick: () => void;
  completed?: boolean;
}) {
  const statusInfo = CUSTOMER_STATUS_MAP[job.status];

  return (
    <button
      onClick={onClick}
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

      {/* Status badge */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{
            backgroundColor: completed ? '#10B98122' : `${primaryColor}22`,
            color: completed ? '#10B981' : primaryColor,
          }}
        >
          {job.statusLabel}
        </span>
        {job.scheduledStart && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar size={12} />
            Starts {job.scheduledStart}
          </span>
        )}
      </div>

      {/* Progress tracker */}
      {!completed && (
        <JobProgressTracker
          currentStep={job.statusStep}
          totalSteps={job.totalSteps}
          primaryColor={primaryColor}
        />
      )}

      {/* Status description */}
      {statusInfo && (
        <p className="text-gray-500 text-sm mt-3">{statusInfo.description}</p>
      )}
    </button>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useAuth } from '@/lib/hooks';
import { useCustomerJobs } from '@/lib/hooks/useCustomerPortal';
import { TenantHeader } from '@/components/portal-wl/TenantHeader';
import { JobProgressTracker } from '@/components/portal-wl/JobProgressTracker';
import { CUSTOMER_STATUS_MAP, CustomerJobView } from '@/types/tenant-portal';
import {
  ArrowLeft,
  Calendar,
  Camera,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPin,
  Shield,
} from 'lucide-react';

export default function TenantJobDetail() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;
  const { tenant } = useTenant();
  const { user, loading: authLoading, signOut } = useAuth();
  const { jobs, loading: jobsLoading } = useCustomerJobs(
    user?.email || null,
    tenant.ownerId
  );
  const [showPhotos, setShowPhotos] = useState(false);

  const job = jobs.find((j) => j.id === jobId);
  const statusInfo = job ? CUSTOMER_STATUS_MAP[job.status] : null;
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

  if (authLoading || jobsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
        <div className="animate-spin h-8 w-8 border-2 border-t-transparent rounded-full" style={{ borderColor: primaryColor }} />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
        <TenantHeader tenant={tenant} customerName={user?.displayName} onSignOut={handleSignOut} />
        <div className="max-w-5xl mx-auto px-4 py-12 text-center">
          <p className="text-gray-400">Project not found.</p>
          <button
            onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
            className="mt-4 text-sm underline"
            style={{ color: primaryColor }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const totalPhotos = job.photosBefore.length + job.photosAfter.length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
      <TenantHeader tenant={tenant} customerName={user?.displayName} onSignOut={handleSignOut} />

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        {/* Job header */}
        <div className="bg-[#2D2D2D] rounded-xl p-6 border border-gray-700/50 mb-6">
          <div className="flex items-start justify-between mb-1">
            <h1 className="text-xl font-bold text-white capitalize">{job.type} Project</h1>
            <span className="text-gray-500 text-sm">#{job.jobNumber}</span>
          </div>

          <div className="flex items-center gap-2 text-gray-400 text-sm mb-6">
            <MapPin size={14} />
            {job.address}
          </div>

          {/* Status badge */}
          <div className="flex items-center gap-3 mb-6">
            <span
              className="text-sm font-semibold px-3 py-1.5 rounded-full"
              style={{
                backgroundColor: `${primaryColor}22`,
                color: primaryColor,
              }}
            >
              {job.statusLabel}
            </span>
            {statusInfo && (
              <p className="text-gray-400 text-sm">{statusInfo.description}</p>
            )}
          </div>

          {/* Progress tracker */}
          <JobProgressTracker
            currentStep={job.statusStep}
            totalSteps={job.totalSteps}
            primaryColor={primaryColor}
          />
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Dates */}
          <div className="bg-[#2D2D2D] rounded-xl p-5 border border-gray-700/50">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Calendar size={18} style={{ color: primaryColor }} />
              Schedule
            </h3>
            <div className="space-y-2">
              {job.scheduledStart && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Start Date</span>
                  <span className="text-white">{job.scheduledStart}</span>
                </div>
              )}
              {job.targetCompletion && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Est. Completion</span>
                  <span className="text-white">{job.targetCompletion}</span>
                </div>
              )}
              {!job.scheduledStart && !job.targetCompletion && (
                <p className="text-gray-500 text-sm">Dates will appear once scheduled.</p>
              )}
            </div>
          </div>

          {/* Warranty */}
          <div className="bg-[#2D2D2D] rounded-xl p-5 border border-gray-700/50">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <Shield size={18} className="text-yellow-500" />
              Warranty
            </h3>
            {job.warranty ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Status</span>
                  <span className={job.warranty.status === 'active' ? 'text-green-400' : 'text-gray-400'}>
                    {job.warranty.status.charAt(0).toUpperCase() + job.warranty.status.slice(1)}
                  </span>
                </div>
                {job.warranty.endDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Expires</span>
                    <span className="text-white">{job.warranty.endDate}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">Warranty info will appear after project completion.</p>
            )}
          </div>
        </div>

        {/* Photos */}
        {totalPhotos > 0 && (
          <div className="bg-[#2D2D2D] rounded-xl border border-gray-700/50 mb-6 overflow-hidden">
            <button
              onClick={() => setShowPhotos(!showPhotos)}
              className="w-full px-5 py-4 flex items-center justify-between text-left"
            >
              <h3 className="text-white font-semibold flex items-center gap-2">
                <Camera size={18} style={{ color: primaryColor }} />
                Project Photos ({totalPhotos})
              </h3>
              {showPhotos ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
            </button>

            {showPhotos && (
              <div className="px-5 pb-5 space-y-4">
                {job.photosBefore.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2 font-medium">Before</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {job.photosBefore.map((photo, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.caption || `Before photo ${i + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          {photo.caption && (
                            <p className="text-xs text-gray-500 mt-1">{photo.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {job.photosAfter.length > 0 && (
                  <div>
                    <p className="text-gray-400 text-sm mb-2 font-medium">After</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {job.photosAfter.map((photo, i) => (
                        <div key={i} className="relative group">
                          <img
                            src={photo.url}
                            alt={photo.caption || `After photo ${i + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          {photo.caption && (
                            <p className="text-xs text-gray-500 mt-1">{photo.caption}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Last updated */}
        <div className="text-center text-gray-500 text-xs mt-8">
          <FileText size={12} className="inline mr-1" />
          Last updated: {job.updatedAt}
        </div>
      </main>
    </div>
  );
}

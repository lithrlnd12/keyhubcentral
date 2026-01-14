'use client';

import { useEffect } from 'react';
import { notFound } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  JobHeader,
  JobInfo,
  JobTimeline,
  JobCosts,
  JobCrew,
  CommunicationFeed,
  JobPhotos,
  JobCommission,
} from '@/components/jobs';
import { useJob } from '@/lib/hooks/useJob';
import { useAuth } from '@/lib/hooks/useAuth';

interface JobDetailPageProps {
  params: { id: string };
}

// Permission helpers
function canViewJob(userRole: string | undefined, job: { salesRepId: string | null; crewIds: string[]; pmId: string | null }, userId: string | undefined): boolean {
  if (!userRole) return false;
  if (['owner', 'admin', 'pm'].includes(userRole)) return true;
  if (job.salesRepId === userId) return true;
  if (job.pmId === userId) return true;
  if (userId && job.crewIds.includes(userId)) return true;
  return false;
}

function canEditJob(userRole: string | undefined): boolean {
  if (!userRole) return false;
  return ['owner', 'admin', 'pm'].includes(userRole);
}

function canEditCommission(userRole: string | undefined, job: { salesRepId: string | null }, userId: string | undefined): boolean {
  if (!userRole) return false;
  // Admins and sales rep assigned to job can edit commission
  if (['owner', 'admin'].includes(userRole)) return true;
  if (job.salesRepId === userId) return true;
  return false;
}

function canApproveCommission(userRole: string | undefined): boolean {
  if (!userRole) return false;
  // Only admins can approve and mark as paid
  return ['owner', 'admin'].includes(userRole);
}

export default function JobDetailPage({ params }: JobDetailPageProps) {
  const { user } = useAuth();
  const { job, loading, error, update } = useJob(params.id);

  const canView = job && canViewJob(user?.role, job, user?.uid);
  const canEdit = canEditJob(user?.role);

  useEffect(() => {
    if (!loading && !job) {
      notFound();
    }
  }, [loading, job]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  if (!canView) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-500">You don&apos;t have permission to view this job.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <JobHeader job={job} canEdit={canEdit} onUpdate={update} />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Details</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
          <TabsTrigger value="commission">Commission</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
          <TabsTrigger value="crew">Crew</TabsTrigger>
          <TabsTrigger value="comms">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <JobInfo job={job} />
        </TabsContent>

        <TabsContent value="photos">
          <JobPhotos
            job={job}
            userId={user?.uid || ''}
            userName={user?.displayName || 'Unknown'}
            userRole={user?.role}
            onUpdate={() => {}}
          />
        </TabsContent>

        <TabsContent value="commission">
          <JobCommission
            job={job}
            canEdit={canEditCommission(user?.role, job, user?.uid)}
            canApprove={canApproveCommission(user?.role)}
            userId={user?.uid || ''}
            onUpdate={update}
          />
        </TabsContent>

        <TabsContent value="timeline">
          <JobTimeline job={job} canEdit={canEdit} onUpdate={update} />
        </TabsContent>

        <TabsContent value="costs">
          <JobCosts job={job} canEdit={canEdit} onUpdate={update} />
        </TabsContent>

        <TabsContent value="crew">
          <JobCrew job={job} canEdit={canEdit} onUpdate={update} />
        </TabsContent>

        <TabsContent value="comms">
          <CommunicationFeed
            jobId={job.id}
            userId={user?.uid || ''}
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useSearchParams, notFound, redirect } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { useJob } from '@/lib/hooks/useJob';
import { JobForm } from '@/components/jobs/JobForm';
import { Spinner } from '@/components/ui/Spinner';

interface EditJobPageProps {
  params: { id: string };
}

export default function EditJobPage({ params }: EditJobPageProps) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'customer';

  const { user, loading: authLoading } = useAuth();
  const { job, loading: jobLoading, error } = useJob(params.id);

  // Only owner, admin, or pm can edit jobs
  const canEdit = user?.role && ['owner', 'admin', 'pm'].includes(user.role);

  useEffect(() => {
    if (!authLoading && !canEdit) {
      redirect(`/kr/${params.id}`);
    }
  }, [authLoading, canEdit, params.id]);

  useEffect(() => {
    if (!jobLoading && !job) {
      notFound();
    }
  }, [jobLoading, job]);

  if (authLoading || jobLoading) {
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

  return <JobForm job={job} initialTab={initialTab} />;
}

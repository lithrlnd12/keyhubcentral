'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getJobsByCrewMember,
  subscribeToContractorJobs,
  getContractorCompletedJobs,
} from '@/lib/firebase/jobs';
import { Job, JobStatus } from '@/types/job';

interface UseContractorJobsOptions {
  contractorId: string;
  realtime?: boolean;
  statusFilter?: JobStatus[];
}

interface UseContractorJobsReturn {
  jobs: Job[];
  activeJobs: Job[];
  completedJobs: Job[];
  loading: boolean;
  error: string | null;
  totalJobValue: number;
  jobCount: number;
  refetch: () => Promise<void>;
  getCompletedJobsForInvoicing: () => Promise<Job[]>;
}

export function useContractorJobs(
  options: UseContractorJobsOptions
): UseContractorJobsReturn {
  const { contractorId, realtime = false, statusFilter } = options;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJobs = useCallback(async () => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getJobsByCrewMember(contractorId);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [contractorId]);

  useEffect(() => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);

      const unsubscribe = subscribeToContractorJobs(contractorId, (data) => {
        setJobs(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchJobs();
    }
  }, [contractorId, realtime, fetchJobs]);

  // Filter jobs by status if filter is provided
  const filteredJobs = statusFilter
    ? jobs.filter((job) => statusFilter.includes(job.status))
    : jobs;

  // Compute derived values
  const activeJobs = jobs.filter((job) =>
    ['scheduled', 'started'].includes(job.status)
  );

  const completedJobs = jobs.filter((job) =>
    ['complete', 'paid_in_full'].includes(job.status)
  );

  const totalJobValue = jobs.reduce((sum, job) => {
    return sum + (job.costs?.laborActual || job.costs?.laborProjected || 0);
  }, 0);

  // Function to get completed jobs for invoice creation
  const getCompletedJobsForInvoicing = useCallback(async () => {
    if (!contractorId) return [];
    return getContractorCompletedJobs(contractorId);
  }, [contractorId]);

  return {
    jobs: filteredJobs,
    activeJobs,
    completedJobs,
    loading,
    error,
    totalJobValue,
    jobCount: jobs.length,
    refetch: fetchJobs,
    getCompletedJobsForInvoicing,
  };
}

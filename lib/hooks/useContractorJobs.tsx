'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getJobsByCrewMember,
  subscribeToContractorJobs,
  getContractorCompletedJobs,
} from '@/lib/firebase/jobs';
import { getContractorByUserId } from '@/lib/firebase/contractors';
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
  // Resolved Firestore document ID for the contractor (may differ from user UID)
  const [resolvedId, setResolvedId] = useState<string | null>(null);

  // Resolve the contractor's Firestore document ID from the user UID.
  // crewIds stores document IDs (not user UIDs) so we must look up the doc first.
  useEffect(() => {
    if (!contractorId) {
      setResolvedId(null);
      return;
    }
    getContractorByUserId(contractorId)
      .then((contractor) => setResolvedId(contractor?.id ?? contractorId))
      .catch(() => setResolvedId(contractorId));
  }, [contractorId]);

  const fetchJobs = useCallback(async () => {
    if (!resolvedId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getJobsByCrewMember(resolvedId);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [resolvedId]);

  useEffect(() => {
    if (!resolvedId) return;

    if (realtime) {
      setLoading(true);

      const unsubscribe = subscribeToContractorJobs(resolvedId, (data) => {
        setJobs(data);
        setLoading(false);
      }, (err) => {
        console.error('useContractorJobs subscription error:', err);
        setError('Failed to load jobs');
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchJobs();
    }
  }, [resolvedId, realtime, fetchJobs]);

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
    if (!resolvedId) return [];
    return getContractorCompletedJobs(resolvedId);
  }, [resolvedId]);

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

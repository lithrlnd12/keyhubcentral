'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getJobs,
  subscribeToJobs,
  JobFilters,
} from '@/lib/firebase/jobs';
import { Job, JobStatus, JobType } from '@/types/job';

interface UseJobsOptions {
  realtime?: boolean;
  initialFilters?: JobFilters;
}

interface UseJobsReturn {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  filters: JobFilters;
  setFilters: (filters: JobFilters) => void;
  setStatus: (status: JobStatus | undefined) => void;
  setType: (type: JobType | undefined) => void;
  setSearch: (search: string) => void;
  refetch: () => Promise<void>;
}

export function useJobs(options: UseJobsOptions = {}): UseJobsReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<JobFilters>(initialFilters);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getJobs(filters);
      setJobs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToJobs((data) => {
        setJobs(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchJobs();
    }
  }, [realtime, filters, fetchJobs]);

  const setStatus = useCallback((status: JobStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setType = useCallback((type: JobType | undefined) => {
    setFilters((prev) => ({ ...prev, type }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  return {
    jobs,
    loading,
    error,
    filters,
    setFilters,
    setStatus,
    setType,
    setSearch,
    refetch: fetchJobs,
  };
}

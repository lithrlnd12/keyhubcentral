'use client';

import { useState, useEffect, useCallback } from 'react';
import { getJob, subscribeToJob, updateJob } from '@/lib/firebase/jobs';
import { Job } from '@/types/job';

interface UseJobOptions {
  realtime?: boolean;
}

interface UseJobReturn {
  job: Job | null;
  loading: boolean;
  error: string | null;
  update: (data: Partial<Job>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useJob(id: string, options: UseJobOptions = {}): UseJobReturn {
  const { realtime = true } = options;

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchJob = useCallback(async () => {
    if (!id) {
      setJob(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getJob(id);
      setJob(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch job');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setJob(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToJob(id, (data) => {
        setJob(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchJob();
    }
  }, [id, realtime, fetchJob]);

  const update = useCallback(
    async (data: Partial<Job>) => {
      if (!id) return;

      try {
        setError(null);
        await updateJob(id, data);
        // If not realtime, refetch after update
        if (!realtime) {
          await fetchJob();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update job');
        throw err;
      }
    },
    [id, realtime, fetchJob]
  );

  return {
    job,
    loading,
    error,
    update,
    refetch: fetchJob,
  };
}

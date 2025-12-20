'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getCommunications,
  subscribeToCommunications,
  addCommunication,
  deleteCommunication,
} from '@/lib/firebase/communications';
import { JobCommunication, CommunicationType } from '@/types/job';

interface UseCommunicationsOptions {
  realtime?: boolean;
  maxResults?: number;
}

interface UseCommunicationsReturn {
  communications: JobCommunication[];
  loading: boolean;
  error: string | null;
  addEntry: (type: CommunicationType, content: string, attachments?: string[]) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCommunications(
  jobId: string,
  userId: string,
  options: UseCommunicationsOptions = {}
): UseCommunicationsReturn {
  const { realtime = true, maxResults = 50 } = options;

  const [communications, setCommunications] = useState<JobCommunication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunications = useCallback(async () => {
    if (!jobId) return;

    try {
      setLoading(true);
      setError(null);
      const data = await getCommunications(jobId, maxResults);
      setCommunications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch communications');
    } finally {
      setLoading(false);
    }
  }, [jobId, maxResults]);

  useEffect(() => {
    if (!jobId) {
      setCommunications([]);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToCommunications(
        jobId,
        (data) => {
          setCommunications(data);
          setLoading(false);
        },
        maxResults
      );

      return unsubscribe;
    } else {
      fetchCommunications();
    }
  }, [jobId, realtime, maxResults, fetchCommunications]);

  const addEntry = useCallback(
    async (type: CommunicationType, content: string, attachments?: string[]) => {
      if (!jobId || !userId) return;

      try {
        setError(null);
        await addCommunication(jobId, {
          type,
          userId,
          content,
          attachments,
        });
        if (!realtime) {
          await fetchCommunications();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to add communication');
        throw err;
      }
    },
    [jobId, userId, realtime, fetchCommunications]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!jobId) return;

      try {
        setError(null);
        await deleteCommunication(jobId, id);
        if (!realtime) {
          await fetchCommunications();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete communication');
        throw err;
      }
    },
    [jobId, realtime, fetchCommunications]
  );

  return {
    communications,
    loading,
    error,
    addEntry,
    deleteEntry,
    refetch: fetchCommunications,
  };
}

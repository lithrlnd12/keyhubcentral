'use client';

import { useState, useEffect, useCallback } from 'react';
import { getLead, subscribeToLead, updateLead } from '@/lib/firebase/leads';
import { Lead } from '@/types/lead';

interface UseLeadOptions {
  realtime?: boolean;
}

interface UseLeadReturn {
  lead: Lead | null;
  loading: boolean;
  error: string | null;
  update: (data: Partial<Lead>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useLead(id: string, options: UseLeadOptions = {}): UseLeadReturn {
  const { realtime = true } = options;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLead = useCallback(async () => {
    if (!id) {
      setLead(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getLead(id);
      setLead(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch lead');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setLead(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToLead(id, (data) => {
        setLead(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchLead();
    }
  }, [id, realtime, fetchLead]);

  const update = useCallback(
    async (data: Partial<Lead>) => {
      if (!id) return;

      try {
        setError(null);
        await updateLead(id, data);
        // If not realtime, refetch after update
        if (!realtime) {
          await fetchLead();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update lead');
        throw err;
      }
    },
    [id, realtime, fetchLead]
  );

  return {
    lead,
    loading,
    error,
    update,
    refetch: fetchLead,
  };
}

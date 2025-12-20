'use client';

import { useState, useEffect, useCallback } from 'react';
import { getContractor, getContractorByUserId } from '@/lib/firebase/contractors';
import { Contractor } from '@/types/contractor';

interface UseContractorReturn {
  contractor: Contractor | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useContractor(id: string): UseContractorReturn {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContractor = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getContractor(id);
      setContractor(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contractor');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchContractor();
  }, [fetchContractor]);

  return {
    contractor,
    loading,
    error,
    refetch: fetchContractor,
  };
}

export function useContractorByUserId(userId: string): UseContractorReturn {
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchContractor = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getContractorByUserId(userId);
      setContractor(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contractor');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchContractor();
  }, [fetchContractor]);

  return {
    contractor,
    loading,
    error,
    refetch: fetchContractor,
  };
}

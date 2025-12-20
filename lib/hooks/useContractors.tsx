'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getContractors,
  subscribeToContractors,
  ContractorFilters,
} from '@/lib/firebase/contractors';
import { Contractor, ContractorStatus, Trade } from '@/types/contractor';

interface UseContractorsOptions {
  realtime?: boolean;
  initialFilters?: ContractorFilters;
}

interface UseContractorsReturn {
  contractors: Contractor[];
  loading: boolean;
  error: string | null;
  filters: ContractorFilters;
  setFilters: (filters: ContractorFilters) => void;
  setStatus: (status: ContractorStatus | undefined) => void;
  setTrade: (trade: Trade | undefined) => void;
  setSearch: (search: string) => void;
  refetch: () => Promise<void>;
}

export function useContractors(options: UseContractorsOptions = {}): UseContractorsReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContractorFilters>(initialFilters);

  const fetchContractors = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getContractors(filters);
      setContractors(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contractors');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToContractors((data) => {
        setContractors(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchContractors();
    }
  }, [realtime, filters, fetchContractors]);

  const setStatus = useCallback((status: ContractorStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setTrade = useCallback((trade: Trade | undefined) => {
    setFilters((prev) => ({ ...prev, trade }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  return {
    contractors,
    loading,
    error,
    filters,
    setFilters,
    setStatus,
    setTrade,
    setSearch,
    refetch: fetchContractors,
  };
}

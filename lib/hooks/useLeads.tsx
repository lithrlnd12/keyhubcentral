'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getLeads,
  subscribeToLeads,
  LeadFilters,
} from '@/lib/firebase/leads';
import { Lead, LeadStatus, LeadSource, LeadQuality } from '@/types/lead';

interface UseLeadsOptions {
  realtime?: boolean;
  initialFilters?: LeadFilters;
}

interface UseLeadsReturn {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  filters: LeadFilters;
  setFilters: (filters: LeadFilters) => void;
  setStatus: (status: LeadStatus | undefined) => void;
  setSource: (source: LeadSource | undefined) => void;
  setQuality: (quality: LeadQuality | undefined) => void;
  setSearch: (search: string) => void;
  refetch: () => Promise<void>;
}

export function useLeads(options: UseLeadsOptions = {}): UseLeadsReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LeadFilters>(initialFilters);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLeads(filters);
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToLeads((data) => {
        setLeads(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchLeads();
    }
  }, [realtime, filters, fetchLeads]);

  const setStatus = useCallback((status: LeadStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setSource = useCallback((source: LeadSource | undefined) => {
    setFilters((prev) => ({ ...prev, source }));
  }, []);

  const setQuality = useCallback((quality: LeadQuality | undefined) => {
    setFilters((prev) => ({ ...prev, quality }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  return {
    leads,
    loading,
    error,
    filters,
    setFilters,
    setStatus,
    setSource,
    setQuality,
    setSearch,
    refetch: fetchLeads,
  };
}

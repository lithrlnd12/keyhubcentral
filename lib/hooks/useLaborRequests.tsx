'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getLaborRequests,
  getLaborRequest,
  subscribeToLaborRequests,
  subscribeToLaborRequest,
} from '@/lib/firebase/laborRequests';
import { LaborRequest, LaborRequestStatus, WorkType, LaborRequestFilters } from '@/types/partner';

interface UseLaborRequestsOptions {
  realtime?: boolean;
  initialFilters?: LaborRequestFilters;
}

interface UseLaborRequestsReturn {
  requests: LaborRequest[];
  loading: boolean;
  error: string | null;
  filters: LaborRequestFilters;
  setFilters: (filters: LaborRequestFilters) => void;
  setStatus: (status: LaborRequestStatus | undefined) => void;
  setWorkType: (workType: WorkType | undefined) => void;
  setPartnerId: (partnerId: string | undefined) => void;
  setSearch: (search: string) => void;
  refetch: () => Promise<void>;
}

export function useLaborRequests(options: UseLaborRequestsOptions = {}): UseLaborRequestsReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [requests, setRequests] = useState<LaborRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<LaborRequestFilters>(initialFilters);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLaborRequests(filters);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch labor requests');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToLaborRequests((data) => {
        setRequests(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchRequests();
    }
  }, [realtime, filters, fetchRequests]);

  const setStatus = useCallback((status: LaborRequestStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setWorkType = useCallback((workType: WorkType | undefined) => {
    setFilters((prev) => ({ ...prev, workType }));
  }, []);

  const setPartnerId = useCallback((partnerId: string | undefined) => {
    setFilters((prev) => ({ ...prev, partnerId }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  return {
    requests,
    loading,
    error,
    filters,
    setFilters,
    setStatus,
    setWorkType,
    setPartnerId,
    setSearch,
    refetch: fetchRequests,
  };
}

// Hook for single labor request
interface UseLaborRequestReturn {
  request: LaborRequest | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLaborRequest(id: string | undefined, realtime = false): UseLaborRequestReturn {
  const [request, setRequest] = useState<LaborRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequest = useCallback(async () => {
    if (!id) {
      setRequest(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getLaborRequest(id);
      setRequest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch labor request');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setRequest(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToLaborRequest(id, (data) => {
        setRequest(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchRequest();
    }
  }, [id, realtime, fetchRequest]);

  return {
    request,
    loading,
    error,
    refetch: fetchRequest,
  };
}

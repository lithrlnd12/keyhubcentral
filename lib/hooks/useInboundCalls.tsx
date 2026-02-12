'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getInboundCalls,
  getInboundCall,
  subscribeToInboundCalls,
  subscribeToInboundCall,
  subscribeToNewCallsCount,
  updateInboundCallStatus,
  closeInboundCall,
  convertInboundCallToLead,
  InboundCallFilters,
} from '@/lib/firebase/inboundCalls';
import { InboundCall, InboundCallStatus, ClosedReason } from '@/types/inboundCall';
import { useAuth } from './useAuth';

interface UseInboundCallsOptions {
  realtime?: boolean;
  initialFilters?: InboundCallFilters;
}

interface UseInboundCallsReturn {
  calls: InboundCall[];
  loading: boolean;
  error: string | null;
  filters: InboundCallFilters;
  setFilters: (filters: InboundCallFilters) => void;
  setStatus: (status: InboundCallStatus | undefined) => void;
  setSearch: (search: string) => void;
  setDateRange: (from: Date | undefined, to: Date | undefined) => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching and subscribing to inbound calls
 */
export function useInboundCalls(options: UseInboundCallsOptions = {}): UseInboundCallsReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [calls, setCalls] = useState<InboundCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InboundCallFilters>(initialFilters);

  const fetchCalls = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInboundCalls(filters);
      setCalls(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch calls');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToInboundCalls((data) => {
        setCalls(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchCalls();
    }
  }, [realtime, filters, fetchCalls]);

  const setStatus = useCallback((status: InboundCallStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  const setDateRange = useCallback((from: Date | undefined, to: Date | undefined) => {
    setFilters((prev) => ({ ...prev, dateFrom: from, dateTo: to }));
  }, []);

  return {
    calls,
    loading,
    error,
    filters,
    setFilters,
    setStatus,
    setSearch,
    setDateRange,
    refetch: fetchCalls,
  };
}

interface UseInboundCallOptions {
  realtime?: boolean;
}

interface UseInboundCallReturn {
  call: InboundCall | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for fetching a single inbound call
 */
export function useInboundCall(id: string, options: UseInboundCallOptions = {}): UseInboundCallReturn {
  const { realtime = false } = options;

  const [call, setCall] = useState<InboundCall | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCall = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInboundCall(id);
      setCall(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch call');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToInboundCall(id, (data) => {
        setCall(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchCall();
    }
  }, [id, realtime, fetchCall]);

  return {
    call,
    loading,
    error,
    refetch: fetchCall,
  };
}

interface UseNewCallsCountReturn {
  count: number;
  loading: boolean;
}

/**
 * Hook for subscribing to new calls count (for nav badge)
 * Only subscribes for internal users — partners/subscribers don't have access to inboundCalls
 */
export function useNewCallsCount(): UseNewCallsCountReturn {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isInternal = user?.role && ['owner', 'admin', 'sales_rep', 'contractor', 'pm'].includes(user.role);

  useEffect(() => {
    if (!isInternal) {
      setCount(0);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToNewCallsCount((newCount) => {
      setCount(newCount);
      setLoading(false);
    });

    return unsubscribe;
  }, [isInternal]);

  return { count, loading };
}

interface ConvertToLeadOptions {
  userLocation?: {
    zip: string;
    lat: number | null;
    lng: number | null;
  };
}

interface UseInboundCallMutationsReturn {
  markAsReviewed: (id: string) => Promise<void>;
  markAsContacted: (id: string) => Promise<void>;
  closeCall: (id: string, reason: ClosedReason) => Promise<void>;
  convertToLead: (id: string, options?: ConvertToLeadOptions) => Promise<string>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for inbound call mutations
 */
export function useInboundCallMutations(): UseInboundCallMutationsReturn {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markAsReviewed = useCallback(async (id: string) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);
      await updateInboundCallStatus(id, 'reviewed', user.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as reviewed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const markAsContacted = useCallback(async (id: string) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);
      await updateInboundCallStatus(id, 'contacted', user.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark as contacted';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const closeCall = useCallback(async (id: string, reason: ClosedReason) => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);
      await closeInboundCall(id, reason, user.uid);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to close call';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  const convertToLead = useCallback(async (id: string, options?: ConvertToLeadOptions): Promise<string> => {
    if (!user?.uid) throw new Error('User not authenticated');

    try {
      setLoading(true);
      setError(null);
      const leadId = await convertInboundCallToLead(id, user.uid, options?.userLocation);
      return leadId;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to convert to lead';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  return {
    markAsReviewed,
    markAsContacted,
    closeCall,
    convertToLead,
    loading,
    error,
  };
}

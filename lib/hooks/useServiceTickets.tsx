'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getServiceTickets,
  subscribeToServiceTickets,
  ServiceTicketFilters,
} from '@/lib/firebase/serviceTickets';
import { ServiceTicket, ServiceTicketStatus } from '@/types/job';

interface UseServiceTicketsOptions {
  realtime?: boolean;
  initialFilters?: ServiceTicketFilters;
}

interface UseServiceTicketsReturn {
  tickets: ServiceTicket[];
  loading: boolean;
  error: string | null;
  filters: ServiceTicketFilters;
  setFilters: (filters: ServiceTicketFilters) => void;
  setStatus: (status: ServiceTicketStatus | undefined) => void;
  setJobId: (jobId: string | undefined) => void;
  refetch: () => Promise<void>;
}

export function useServiceTickets(
  options: UseServiceTicketsOptions = {}
): UseServiceTicketsReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ServiceTicketFilters>(initialFilters);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getServiceTickets(filters);
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToServiceTickets((data) => {
        setTickets(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchTickets();
    }
  }, [realtime, filters, fetchTickets]);

  const setStatus = useCallback((status: ServiceTicketStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setJobId = useCallback((jobId: string | undefined) => {
    setFilters((prev) => ({ ...prev, jobId }));
  }, []);

  return {
    tickets,
    loading,
    error,
    filters,
    setFilters,
    setStatus,
    setJobId,
    refetch: fetchTickets,
  };
}

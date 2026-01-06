'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPartnerTickets,
  getPartnerTicket,
  subscribeToPartnerTickets,
  subscribeToPartnerTicket,
} from '@/lib/firebase/partnerTickets';
import { PartnerServiceTicket, PartnerTicketStatus, Urgency, PartnerTicketFilters } from '@/types/partner';

interface UsePartnerTicketsOptions {
  realtime?: boolean;
  initialFilters?: PartnerTicketFilters;
}

interface UsePartnerTicketsReturn {
  tickets: PartnerServiceTicket[];
  loading: boolean;
  error: string | null;
  filters: PartnerTicketFilters;
  setFilters: (filters: PartnerTicketFilters) => void;
  setStatus: (status: PartnerTicketStatus | undefined) => void;
  setUrgency: (urgency: Urgency | undefined) => void;
  setPartnerId: (partnerId: string | undefined) => void;
  setSearch: (search: string) => void;
  refetch: () => Promise<void>;
}

export function usePartnerTickets(options: UsePartnerTicketsOptions = {}): UsePartnerTicketsReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [tickets, setTickets] = useState<PartnerServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PartnerTicketFilters>(initialFilters);

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPartnerTickets(filters);
      setTickets(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch partner tickets');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToPartnerTickets((data) => {
        setTickets(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchTickets();
    }
  }, [realtime, filters, fetchTickets]);

  const setStatus = useCallback((status: PartnerTicketStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setUrgency = useCallback((urgency: Urgency | undefined) => {
    setFilters((prev) => ({ ...prev, urgency }));
  }, []);

  const setPartnerId = useCallback((partnerId: string | undefined) => {
    setFilters((prev) => ({ ...prev, partnerId }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  return {
    tickets,
    loading,
    error,
    filters,
    setFilters,
    setStatus,
    setUrgency,
    setPartnerId,
    setSearch,
    refetch: fetchTickets,
  };
}

// Hook for single partner ticket
interface UsePartnerTicketReturn {
  ticket: PartnerServiceTicket | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePartnerTicket(id: string | undefined, realtime = false): UsePartnerTicketReturn {
  const [ticket, setTicket] = useState<PartnerServiceTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicket = useCallback(async () => {
    if (!id) {
      setTicket(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPartnerTicket(id);
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch partner ticket');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setTicket(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToPartnerTicket(id, (data) => {
        setTicket(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchTicket();
    }
  }, [id, realtime, fetchTicket]);

  return {
    ticket,
    loading,
    error,
    refetch: fetchTicket,
  };
}

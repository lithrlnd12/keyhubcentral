'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPartners,
  getPartner,
  subscribeToPartners,
  subscribeToPartner,
} from '@/lib/firebase/partners';
import { Partner, PartnerStatus, PartnerFilters } from '@/types/partner';

interface UsePartnersOptions {
  realtime?: boolean;
  initialFilters?: PartnerFilters;
}

interface UsePartnersReturn {
  partners: Partner[];
  loading: boolean;
  error: string | null;
  filters: PartnerFilters;
  setFilters: (filters: PartnerFilters) => void;
  setStatus: (status: PartnerStatus | undefined) => void;
  setSearch: (search: string) => void;
  refetch: () => Promise<void>;
}

export function usePartners(options: UsePartnersOptions = {}): UsePartnersReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PartnerFilters>(initialFilters);

  const fetchPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getPartners(filters);
      setPartners(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch partners');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToPartners((data) => {
        setPartners(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchPartners();
    }
  }, [realtime, filters, fetchPartners]);

  const setStatus = useCallback((status: PartnerStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  return {
    partners,
    loading,
    error,
    filters,
    setFilters,
    setStatus,
    setSearch,
    refetch: fetchPartners,
  };
}

// Hook for single partner
interface UsePartnerReturn {
  partner: Partner | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePartner(id: string | undefined, realtime = false): UsePartnerReturn {
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPartner = useCallback(async () => {
    if (!id) {
      setPartner(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getPartner(id);
      setPartner(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch partner');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setPartner(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToPartner(id, (data) => {
        setPartner(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchPartner();
    }
  }, [id, realtime, fetchPartner]);

  return {
    partner,
    loading,
    error,
    refetch: fetchPartner,
  };
}

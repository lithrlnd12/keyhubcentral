'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getInvoices,
  subscribeToInvoices,
  InvoiceFilters,
} from '@/lib/firebase/invoices';
import { Invoice, InvoiceStatus, InvoiceEntity } from '@/types/invoice';

interface UseInvoicesOptions {
  realtime?: boolean;
  initialFilters?: InvoiceFilters;
}

interface UseInvoicesReturn {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  filters: InvoiceFilters;
  setFilters: (filters: InvoiceFilters) => void;
  setStatus: (status: InvoiceStatus | undefined) => void;
  setFromEntity: (entity: InvoiceEntity['entity'] | undefined) => void;
  setToEntity: (entity: InvoiceEntity['entity'] | undefined) => void;
  setSearch: (search: string) => void;
  setOverdue: (overdue: boolean) => void;
  refetch: () => Promise<void>;
}

export function useInvoices(options: UseInvoicesOptions = {}): UseInvoicesReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InvoiceFilters>(initialFilters);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getInvoices(filters);
      setInvoices(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToInvoices((data) => {
        setInvoices(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchInvoices();
    }
  }, [realtime, filters, fetchInvoices]);

  const setStatus = useCallback((status: InvoiceStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const setFromEntity = useCallback((fromEntity: InvoiceEntity['entity'] | undefined) => {
    setFilters((prev) => ({ ...prev, fromEntity }));
  }, []);

  const setToEntity = useCallback((toEntity: InvoiceEntity['entity'] | undefined) => {
    setFilters((prev) => ({ ...prev, toEntity }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  const setOverdue = useCallback((overdue: boolean) => {
    setFilters((prev) => ({ ...prev, overdue: overdue || undefined }));
  }, []);

  return {
    invoices,
    loading,
    error,
    filters,
    setFilters,
    setStatus,
    setFromEntity,
    setToEntity,
    setSearch,
    setOverdue,
    refetch: fetchInvoices,
  };
}

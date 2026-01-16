'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getContractorInvoices,
  getContractorPayments,
  subscribeToContractorInvoices,
  getContractorInvoiceStats,
} from '@/lib/firebase/invoices';
import { Invoice, InvoiceStatus } from '@/types/invoice';

interface UseContractorInvoicesOptions {
  contractorId: string;
  realtime?: boolean;
}

interface UseContractorInvoicesReturn {
  invoices: Invoice[];
  payments: Invoice[];
  loading: boolean;
  error: string | null;
  stats: {
    totalInvoices: number;
    totalRevenue: number;
    pendingRevenue: number;
    draftCount: number;
    sentCount: number;
    paidCount: number;
  };
  statusFilter: InvoiceStatus | undefined;
  setStatusFilter: (status: InvoiceStatus | undefined) => void;
  refetch: () => Promise<void>;
}

export function useContractorInvoices(
  options: UseContractorInvoicesOptions
): UseContractorInvoicesReturn {
  const { contractorId, realtime = false } = options;

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | undefined>();
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    draftCount: 0,
    sentCount: 0,
    paidCount: 0,
  });

  const fetchData = useCallback(async () => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [invoiceData, paymentData, statsData] = await Promise.all([
        getContractorInvoices(contractorId),
        getContractorPayments(contractorId),
        getContractorInvoiceStats(contractorId),
      ]);

      setInvoices(invoiceData);
      setPayments(paymentData);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invoices');
    } finally {
      setLoading(false);
    }
  }, [contractorId]);

  useEffect(() => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);

      const unsubscribe = subscribeToContractorInvoices(contractorId, (data) => {
        setInvoices(data);
        setLoading(false);

        // Calculate stats from received data
        const newStats = {
          totalInvoices: data.length,
          totalRevenue: 0,
          pendingRevenue: 0,
          draftCount: 0,
          sentCount: 0,
          paidCount: 0,
        };

        data.forEach((inv) => {
          switch (inv.status) {
            case 'draft':
              newStats.draftCount++;
              break;
            case 'sent':
              newStats.sentCount++;
              newStats.pendingRevenue += inv.total || 0;
              break;
            case 'paid':
              newStats.paidCount++;
              newStats.totalRevenue += inv.total || 0;
              break;
          }
        });

        setStats(newStats);
      });

      // Also fetch payments (no realtime needed for incoming payments)
      getContractorPayments(contractorId).then(setPayments);

      return unsubscribe;
    } else {
      fetchData();
    }
  }, [contractorId, realtime, fetchData]);

  // Filter invoices by status if filter is set
  const filteredInvoices = statusFilter
    ? invoices.filter((inv) => inv.status === statusFilter)
    : invoices;

  return {
    invoices: filteredInvoices,
    payments,
    loading,
    error,
    stats,
    statusFilter,
    setStatusFilter,
    refetch: fetchData,
  };
}

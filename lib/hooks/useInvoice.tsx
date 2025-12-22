'use client';

import { useState, useEffect } from 'react';
import { getInvoice, subscribeToInvoice } from '@/lib/firebase/invoices';
import { Invoice } from '@/types/invoice';

interface UseInvoiceOptions {
  realtime?: boolean;
}

interface UseInvoiceReturn {
  invoice: Invoice | null;
  loading: boolean;
  error: string | null;
}

export function useInvoice(
  id: string | null,
  options: UseInvoiceOptions = {}
): UseInvoiceReturn {
  const { realtime = false } = options;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setInvoice(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToInvoice(id, (data) => {
        setInvoice(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      const fetchInvoice = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await getInvoice(id);
          setInvoice(data);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to fetch invoice');
        } finally {
          setLoading(false);
        }
      };

      fetchInvoice();
    }
  }, [id, realtime]);

  return { invoice, loading, error };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAuth } from 'firebase/auth';
import {
  Receipt,
  ReceiptFilters,
  ReceiptStatus,
  ReceiptItem,
} from '@/types/inventory';
import {
  getReceipts,
  getReceipt,
  subscribeToReceipts,
  subscribeToReceipt,
  uploadAndCreateReceipt,
  updateReceiptItems,
  updateReceiptVendor,
  verifyReceipt,
  addReceiptToPL,
  deleteReceipt,
  getPendingReceiptsCount,
  getReceiptsNeedingVerification,
} from '@/lib/firebase/receipts';

interface UseReceiptsOptions {
  status?: ReceiptStatus;
  uploadedBy?: string;
  locationId?: string;
  realtime?: boolean;
  contractorId?: string; // Filter receipts by owner contractor
}

interface UseReceiptsReturn {
  receipts: Receipt[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setStatus: (status?: ReceiptStatus) => void;
  filters: ReceiptFilters;
}

export function useReceipts(options: UseReceiptsOptions = {}): UseReceiptsReturn {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReceiptFilters>({
    status: options.status,
    uploadedBy: options.uploadedBy,
    locationId: options.locationId,
    contractorId: options.contractorId,
  });

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getReceipts(filters);
      setReceipts(data);
    } catch (err) {
      setError('Failed to fetch receipts');
      console.error('useReceipts error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    // Don't fire queries if contractorId filter is expected but not yet available
    if (options.contractorId !== undefined && !filters.contractorId) {
      setReceipts([]);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      const unsubscribe = subscribeToReceipts((data) => {
        setReceipts(data);
        setLoading(false);
      }, filters, (err) => {
        console.error('useReceipts subscription error:', err);
        setError('Failed to load receipts');
        setReceipts([]);
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      fetchReceipts();
    }
  }, [options.realtime, options.contractorId, filters, fetchReceipts]);

  const setStatus = useCallback((status?: ReceiptStatus) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  return {
    receipts,
    loading,
    error,
    refetch: fetchReceipts,
    setStatus,
    filters,
  };
}

interface UseReceiptReturn {
  receipt: Receipt | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useReceipt(
  id: string,
  options: { realtime?: boolean } = {}
): UseReceiptReturn {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipt = useCallback(async () => {
    if (!id) {
      setReceipt(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getReceipt(id);
      setReceipt(data);
    } catch (err) {
      setError('Failed to fetch receipt');
      console.error('useReceipt error:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setReceipt(null);
      setLoading(false);
      return;
    }

    if (options.realtime) {
      const unsubscribe = subscribeToReceipt(id, (data) => {
        setReceipt(data);
        setLoading(false);
      }, (err) => {
        console.error('useReceipt subscription error:', err);
        setError('Failed to load receipt');
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      fetchReceipt();
    }
  }, [id, options.realtime, fetchReceipt]);

  return {
    receipt,
    loading,
    error,
    refetch: fetchReceipt,
  };
}

interface UseReceiptMutationsReturn {
  uploadReceipt: (
    file: File,
    userId: string,
    userName: string,
    locationId?: string,
    locationName?: string,
    contractorId?: string
  ) => Promise<{ receiptId: string; imageUrl: string }>;
  parseReceipt: (receiptId: string, imageUrl: string) => Promise<void>;
  updateItems: (receiptId: string, items: ReceiptItem[]) => Promise<void>;
  updateVendorInfo: (
    receiptId: string,
    vendor: string,
    purchaseDate?: Date,
    total?: number
  ) => Promise<void>;
  verify: (receiptId: string, verifiedBy: string) => Promise<void>;
  addToPL: (receiptId: string, plExpenseId: string) => Promise<void>;
  remove: (receiptId: string) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useReceiptMutations(): UseReceiptMutationsReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadReceipt = async (
    file: File,
    userId: string,
    userName: string,
    locationId?: string,
    locationName?: string,
    contractorId?: string
  ): Promise<{ receiptId: string; imageUrl: string }> => {
    try {
      setLoading(true);
      setError(null);
      const result = await uploadAndCreateReceipt(
        file,
        userId,
        userName,
        locationId,
        locationName,
        contractorId
      );
      return result;
    } catch (err) {
      const message = 'Failed to upload receipt';
      setError(message);
      console.error('uploadReceipt error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const parseReceipt = async (
    receiptId: string,
    imageUrl: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);

      // Get auth token for API authentication
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Not authenticated');
      }
      const token = await user.getIdToken();

      const response = await fetch('/api/receipts/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ receiptId, imageUrl }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to parse receipt');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse receipt';
      setError(message);
      console.error('parseReceipt error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const updateItems = async (
    receiptId: string,
    items: ReceiptItem[]
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await updateReceiptItems(receiptId, items);
    } catch (err) {
      const message = 'Failed to update receipt items';
      setError(message);
      console.error('updateItems error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const updateVendorInfo = async (
    receiptId: string,
    vendor: string,
    purchaseDate?: Date,
    total?: number
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await updateReceiptVendor(receiptId, vendor, purchaseDate, total);
    } catch (err) {
      const message = 'Failed to update vendor info';
      setError(message);
      console.error('updateVendorInfo error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (receiptId: string, verifiedBy: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await verifyReceipt(receiptId, verifiedBy);
    } catch (err) {
      const message = 'Failed to verify receipt';
      setError(message);
      console.error('verify error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const addToPL = async (
    receiptId: string,
    plExpenseId: string
  ): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await addReceiptToPL(receiptId, plExpenseId);
    } catch (err) {
      const message = 'Failed to add receipt to P&L';
      setError(message);
      console.error('addToPL error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (receiptId: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await deleteReceipt(receiptId);
    } catch (err) {
      const message = 'Failed to delete receipt';
      setError(message);
      console.error('remove error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadReceipt,
    parseReceipt,
    updateItems,
    updateVendorInfo,
    verify,
    addToPL,
    remove,
    loading,
    error,
  };
}

interface UsePendingReceiptsCountReturn {
  count: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function usePendingReceiptsCount(): UsePendingReceiptsCountReturn {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPendingReceiptsCount();
      setCount(data);
    } catch (err) {
      console.error('usePendingReceiptsCount error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    count,
    loading,
    refetch: fetchCount,
  };
}

interface UseReceiptsNeedingVerificationReturn {
  receipts: Receipt[];
  count: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useReceiptsNeedingVerification(): UseReceiptsNeedingVerificationReturn {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getReceiptsNeedingVerification();
      setReceipts(data);
    } catch (err) {
      console.error('useReceiptsNeedingVerification error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  return {
    receipts,
    count: receipts.length,
    loading,
    refetch: fetchReceipts,
  };
}

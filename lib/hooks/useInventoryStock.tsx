'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StockWithVariance,
  StockFilters,
  LowStockAlert,
  InventoryCount,
  InventoryCountItem,
} from '@/types/inventory';
import {
  getStockWithVariance,
  getLowStockItems,
  getLowStockCount,
  subscribeToInventoryStock,
  subscribeToLowStockAlerts,
  submitInventoryCount,
  getInventoryCounts,
  getRecentCounts,
} from '@/lib/firebase/inventoryStock';

interface UseInventoryStockOptions {
  locationId?: string;
  itemId?: string;
  belowPar?: boolean;
  realtime?: boolean;
}

interface UseInventoryStockReturn {
  stock: StockWithVariance[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInventoryStock(
  options: UseInventoryStockOptions = {}
): UseInventoryStockReturn {
  const [stock, setStock] = useState<StockWithVariance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const filters: StockFilters = useMemo(() => ({
    locationId: options.locationId,
    itemId: options.itemId,
    belowPar: options.belowPar,
  }), [options.locationId, options.itemId, options.belowPar]);

  const fetchStock = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getStockWithVariance(filters);
      setStock(data);
    } catch (err) {
      setError('Failed to fetch inventory stock');
      console.error('useInventoryStock error:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (options.realtime) {
      const unsubscribe = subscribeToInventoryStock((data) => {
        setStock(data);
        setLoading(false);
      }, filters, (err) => {
        console.error('useInventoryStock subscription error:', err);
        setError('Failed to load inventory stock');
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      fetchStock();
    }
  }, [options.realtime, filters, fetchStock]);

  return {
    stock,
    loading,
    error,
    refetch: fetchStock,
  };
}

interface UseLowStockAlertsOptions {
  locationId?: string;
  realtime?: boolean;
}

interface UseLowStockAlertsReturn {
  alerts: LowStockAlert[];
  count: number;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLowStockAlerts(
  options: UseLowStockAlertsOptions = {}
): UseLowStockAlertsReturn {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getLowStockItems(options.locationId);
      setAlerts(data);
    } catch (err) {
      setError('Failed to fetch low stock alerts');
      console.error('useLowStockAlerts error:', err);
    } finally {
      setLoading(false);
    }
  }, [options.locationId]);

  useEffect(() => {
    if (options.realtime) {
      const unsubscribe = subscribeToLowStockAlerts((data) => {
        setAlerts(data);
        setLoading(false);
      }, options.locationId, (err) => {
        console.error('useLowStockAlerts subscription error:', err);
        setError('Failed to load low stock alerts');
        setLoading(false);
      });

      return () => unsubscribe();
    } else {
      fetchAlerts();
    }
  }, [options.realtime, options.locationId, fetchAlerts]);

  return {
    alerts,
    count: alerts.length,
    loading,
    error,
    refetch: fetchAlerts,
  };
}

interface UseLowStockCountReturn {
  count: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

export function useLowStockCount(locationId?: string): UseLowStockCountReturn {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getLowStockCount(locationId);
      setCount(data);
    } catch (err) {
      console.error('useLowStockCount error:', err);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  return {
    count,
    loading,
    refetch: fetchCount,
  };
}

interface UseInventoryCountsOptions {
  locationId?: string;
  limit?: number;
}

interface UseInventoryCountsReturn {
  counts: InventoryCount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useInventoryCounts(
  options: UseInventoryCountsOptions = {}
): UseInventoryCountsReturn {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = options.limit
        ? await getRecentCounts(options.limit)
        : await getInventoryCounts(options.locationId);
      setCounts(data);
    } catch (err) {
      setError('Failed to fetch inventory counts');
      console.error('useInventoryCounts error:', err);
    } finally {
      setLoading(false);
    }
  }, [options.locationId, options.limit]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return {
    counts,
    loading,
    error,
    refetch: fetchCounts,
  };
}

interface UseSubmitCountReturn {
  submitCount: (
    locationId: string,
    locationName: string,
    countedBy: string,
    countedByName: string,
    items: InventoryCountItem[],
    notes?: string
  ) => Promise<string>;
  loading: boolean;
  error: string | null;
}

export function useSubmitCount(): UseSubmitCountReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCount = async (
    locationId: string,
    locationName: string,
    countedBy: string,
    countedByName: string,
    items: InventoryCountItem[],
    notes?: string
  ): Promise<string> => {
    try {
      setLoading(true);
      setError(null);
      const countId = await submitInventoryCount(
        locationId,
        locationName,
        countedBy,
        countedByName,
        items,
        notes
      );
      return countId;
    } catch (err) {
      const message = 'Failed to submit inventory count';
      setError(message);
      console.error('submitCount error:', err);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  return {
    submitCount,
    loading,
    error,
  };
}

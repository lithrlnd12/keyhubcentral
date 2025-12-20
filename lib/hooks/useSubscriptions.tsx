'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getSubscriptions,
  subscribeToSubscriptions,
  SubscriptionFilters,
} from '@/lib/firebase/subscriptions';
import { Subscription, SubscriptionTier, SubscriptionStatus } from '@/types/lead';

interface UseSubscriptionsOptions {
  realtime?: boolean;
  initialFilters?: SubscriptionFilters;
}

interface UseSubscriptionsReturn {
  subscriptions: Subscription[];
  loading: boolean;
  error: string | null;
  filters: SubscriptionFilters;
  setFilters: (filters: SubscriptionFilters) => void;
  setTier: (tier: SubscriptionTier | undefined) => void;
  setStatus: (status: SubscriptionStatus | undefined) => void;
  refetch: () => Promise<void>;
}

export function useSubscriptions(options: UseSubscriptionsOptions = {}): UseSubscriptionsReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SubscriptionFilters>(initialFilters);

  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSubscriptions(filters);
      setSubscriptions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscriptions');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToSubscriptions((data) => {
        setSubscriptions(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchSubscriptions();
    }
  }, [realtime, filters, fetchSubscriptions]);

  const setTier = useCallback((tier: SubscriptionTier | undefined) => {
    setFilters((prev) => ({ ...prev, tier }));
  }, []);

  const setStatus = useCallback((status: SubscriptionStatus | undefined) => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  return {
    subscriptions,
    loading,
    error,
    filters,
    setFilters,
    setTier,
    setStatus,
    refetch: fetchSubscriptions,
  };
}

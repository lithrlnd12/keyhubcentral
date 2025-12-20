'use client';

import { useState, useEffect, useCallback } from 'react';
import { getSubscription, subscribeToSubscription, updateSubscription } from '@/lib/firebase/subscriptions';
import { Subscription } from '@/types/lead';

interface UseSubscriptionOptions {
  realtime?: boolean;
}

interface UseSubscriptionReturn {
  subscription: Subscription | null;
  loading: boolean;
  error: string | null;
  update: (data: Partial<Subscription>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useSubscription(id: string, options: UseSubscriptionOptions = {}): UseSubscriptionReturn {
  const { realtime = true } = options;

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getSubscription(id);
      setSubscription(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToSubscription(id, (data) => {
        setSubscription(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchSubscription();
    }
  }, [id, realtime, fetchSubscription]);

  const update = useCallback(
    async (data: Partial<Subscription>) => {
      if (!id) return;

      try {
        setError(null);
        await updateSubscription(id, data);
        if (!realtime) {
          await fetchSubscription();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update subscription');
        throw err;
      }
    },
    [id, realtime, fetchSubscription]
  );

  return {
    subscription,
    loading,
    error,
    update,
    refetch: fetchSubscription,
  };
}

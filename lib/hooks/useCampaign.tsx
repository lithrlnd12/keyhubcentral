'use client';

import { useState, useEffect, useCallback } from 'react';
import { getCampaign, subscribeToCampaign, updateCampaign } from '@/lib/firebase/campaigns';
import { Campaign } from '@/types/lead';

interface UseCampaignOptions {
  realtime?: boolean;
}

interface UseCampaignReturn {
  campaign: Campaign | null;
  loading: boolean;
  error: string | null;
  update: (data: Partial<Campaign>) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useCampaign(id: string, options: UseCampaignOptions = {}): UseCampaignReturn {
  const { realtime = true } = options;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = useCallback(async () => {
    if (!id) {
      setCampaign(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getCampaign(id);
      setCampaign(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaign');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) {
      setCampaign(null);
      setLoading(false);
      return;
    }

    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToCampaign(id, (data) => {
        setCampaign(data);
        setLoading(false);
      });

      return unsubscribe;
    } else {
      fetchCampaign();
    }
  }, [id, realtime, fetchCampaign]);

  const update = useCallback(
    async (data: Partial<Campaign>) => {
      if (!id) return;

      try {
        setError(null);
        await updateCampaign(id, data);
        if (!realtime) {
          await fetchCampaign();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update campaign');
        throw err;
      }
    },
    [id, realtime, fetchCampaign]
  );

  return {
    campaign,
    loading,
    error,
    update,
    refetch: fetchCampaign,
  };
}

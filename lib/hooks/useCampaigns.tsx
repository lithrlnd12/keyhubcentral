'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getCampaigns,
  subscribeToCampaigns,
  CampaignFilters,
} from '@/lib/firebase/campaigns';
import { Campaign, CampaignPlatform } from '@/types/lead';

interface UseCampaignsOptions {
  realtime?: boolean;
  initialFilters?: CampaignFilters;
}

interface UseCampaignsReturn {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  filters: CampaignFilters;
  setFilters: (filters: CampaignFilters) => void;
  setPlatform: (platform: CampaignPlatform | undefined) => void;
  setSearch: (search: string) => void;
  refetch: () => Promise<void>;
}

export function useCampaigns(options: UseCampaignsOptions = {}): UseCampaignsReturn {
  const { realtime = false, initialFilters = {} } = options;

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CampaignFilters>(initialFilters);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCampaigns(filters);
      setCampaigns(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch campaigns');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    if (realtime) {
      setLoading(true);
      const unsubscribe = subscribeToCampaigns((data) => {
        setCampaigns(data);
        setLoading(false);
      }, filters);

      return unsubscribe;
    } else {
      fetchCampaigns();
    }
  }, [realtime, filters, fetchCampaigns]);

  const setPlatform = useCallback((platform: CampaignPlatform | undefined) => {
    setFilters((prev) => ({ ...prev, platform }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search: search || undefined }));
  }, []);

  return {
    campaigns,
    loading,
    error,
    filters,
    setFilters,
    setPlatform,
    setSearch,
    refetch: fetchCampaigns,
  };
}

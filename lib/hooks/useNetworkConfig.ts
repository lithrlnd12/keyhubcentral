'use client';

import { useState, useEffect } from 'react';
import { TenantNetworkConfig, DEFAULT_NETWORK_CONFIG, Network } from '@/types/network';
import { subscribeToNetworkConfig, subscribeToNetworks } from '@/lib/firebase/network';
import { tenant } from '@/lib/config/tenant';

/**
 * Real-time hook for the current tenant's network config and connected networks.
 * Provides networkIds array for passing to marketplace/contractor queries.
 */
export function useNetworkConfig() {
  const [config, setConfig] = useState<TenantNetworkConfig>(DEFAULT_NETWORK_CONFIG);
  const [networks, setNetworks] = useState<Network[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubConfig = subscribeToNetworkConfig((c) => {
      setConfig(c);
      setLoading(false);
    });
    return () => unsubConfig();
  }, []);

  useEffect(() => {
    if (!config.enabled) {
      setNetworks([]);
      return;
    }
    const unsubNetworks = subscribeToNetworks(tenant.firebaseProjectId, setNetworks);
    return () => unsubNetworks();
  }, [config.enabled]);

  // Flat list of all networkIds this tenant belongs to
  const networkIds = networks.map((n) => n.id);

  return {
    config,
    networks,
    networkIds,
    loading,
    isEnabled: config.enabled,
    canPullContractors: config.enabled && config.pull.contractors,
    canPullMarketplace: config.enabled && config.pull.marketplace,
    sharingContractors: config.enabled && config.share.contractors,
    sharingMarketplace: config.enabled && config.share.marketplace,
  };
}

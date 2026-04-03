'use client';
import { useState, useEffect, useCallback } from 'react';
import { NetworkInvite, RegistryTenant } from '@/types/network';

export function useNetworkInvites(enabled: boolean) {
  const [registry, setRegistry] = useState<RegistryTenant[]>([]);
  const [inbound, setInbound] = useState<NetworkInvite[]>([]);
  const [outbound, setOutbound] = useState<NetworkInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const [regRes, invRes] = await Promise.all([
        fetch('/api/network/registry'),
        fetch('/api/network/invite'),
      ]);
      if (regRes.ok) setRegistry(await regRes.json());
      if (invRes.ok) {
        const data = await invRes.json();
        setInbound(data.inbound || []);
        setOutbound(data.outbound || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll every 30s
  useEffect(() => {
    if (!enabled) return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [enabled, refresh]);

  return { registry, inbound, outbound, loading, refresh };
}

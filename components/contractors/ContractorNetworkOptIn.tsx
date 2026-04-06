'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { useNetworkConfig } from '@/lib/hooks/useNetworkConfig';
import {
  addContractorToNetwork,
  removeContractorFromNetwork,
} from '@/lib/firebase/network';

interface ContractorNetworkOptInProps {
  contractorId: string;
  sharedNetworks?: string[];
}

export function ContractorNetworkOptIn({
  contractorId,
  sharedNetworks = [],
}: ContractorNetworkOptInProps) {
  const { showToast } = useToast();
  const { networks, isEnabled } = useNetworkConfig();
  const [optedIn, setOptedIn] = useState<Set<string>>(new Set(sharedNetworks));
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    setOptedIn(new Set(sharedNetworks));
  }, [sharedNetworks]);

  if (!isEnabled || networks.length === 0) return null;

  const handleToggle = async (networkId: string) => {
    setSaving(networkId);
    try {
      if (optedIn.has(networkId)) {
        await removeContractorFromNetwork(contractorId, networkId);
        setOptedIn((prev) => {
          const next = new Set(prev);
          next.delete(networkId);
          return next;
        });
        showToast('Removed from network', 'success');
      } else {
        await addContractorToNetwork(contractorId, networkId);
        setOptedIn((prev) => new Set(prev).add(networkId));
        showToast('Shared to network', 'success');
      }
    } catch (err) {
      showToast('Failed to update', 'error');
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  return (
    <div id="network">
    <Card className="p-6">
      <CardTitle>Network Visibility</CardTitle>
      <CardDescription>
        You&apos;re automatically enrolled in your company&apos;s networks.
        Toggle off any network you don&apos;t want to be visible in.
        Only your availability is shared — no personal or financial data.
      </CardDescription>
      <div className="mt-4 space-y-3">
        {networks.map((network) => (
          <label
            key={network.id}
            className={`flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer ${
              saving === network.id ? 'opacity-50' : ''
            }`}
          >
            <div>
              <p className="text-white text-sm font-medium">{network.name}</p>
              <p className="text-xs text-gray-400">
                {network.tenants.length} member{network.tenants.length !== 1 ? 's' : ''}
              </p>
            </div>
            <input
              type="checkbox"
              checked={optedIn.has(network.id)}
              onChange={() => handleToggle(network.id)}
              disabled={saving === network.id}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-brand-gold focus:ring-brand-gold focus:ring-offset-brand-charcoal"
            />
          </label>
        ))}
      </div>
    </Card>
    </div>
  );
}

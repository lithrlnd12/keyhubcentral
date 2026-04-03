'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useNetworkConfig } from '@/lib/hooks/useNetworkConfig';
import {
  addContractorToNetwork,
  removeContractorFromNetwork,
} from '@/lib/firebase/network';
import {
  acceptNetworkOptIn,
  declineNetworkOptIn,
  deferNetworkOptIn,
} from '@/lib/firebase/networkNotifications';
import { Timestamp } from 'firebase/firestore';

interface ContractorNetworkOptInProps {
  contractorId: string;
  sharedNetworks?: string[];
  networkOptOut?: boolean;
  networkOptInDismissedAt?: Timestamp;
}

export function ContractorNetworkOptIn({
  contractorId,
  sharedNetworks = [],
  networkOptOut,
  networkOptInDismissedAt,
}: ContractorNetworkOptInProps) {
  const { showToast } = useToast();
  const { networks, networkIds, isEnabled } = useNetworkConfig();
  const [optedIn, setOptedIn] = useState<Set<string>>(new Set(sharedNetworks));
  const [saving, setSaving] = useState<string | null>(null);
  const [hasDecided, setHasDecided] = useState(false);

  useEffect(() => {
    setOptedIn(new Set(sharedNetworks));
  }, [sharedNetworks]);

  if (!isEnabled || networks.length === 0) return null;

  const alreadyOptedIn = sharedNetworks.length > 0;
  const isOptedOut = networkOptOut === true;

  // Check if dismissed within 7 days
  const recentlyDismissed = networkOptInDismissedAt
    ? networkOptInDismissedAt.toMillis() > Date.now() - 7 * 24 * 60 * 60 * 1000
    : false;

  // Show the opt-in prompt if they haven't decided yet
  const showPrompt = !alreadyOptedIn && !isOptedOut && !recentlyDismissed && !hasDecided;

  const handleAcceptAll = async () => {
    setSaving('accept');
    try {
      await acceptNetworkOptIn(contractorId, networkIds);
      setOptedIn(new Set(networkIds));
      setHasDecided(true);
      showToast('You are now visible on the KeyHub Network', 'success');
    } catch (err) {
      showToast('Failed to opt in', 'error');
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const handleDecline = async () => {
    setSaving('decline');
    try {
      await declineNetworkOptIn(contractorId);
      setHasDecided(true);
      showToast('Network visibility declined', 'success');
    } catch (err) {
      showToast('Failed to update', 'error');
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

  const handleDefer = async () => {
    setSaving('defer');
    try {
      await deferNetworkOptIn(contractorId);
      setHasDecided(true);
      showToast('We\'ll ask again in 7 days', 'success');
    } catch (err) {
      showToast('Failed to update', 'error');
      console.error(err);
    } finally {
      setSaving(null);
    }
  };

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
    <Card className="p-6" id="network">
      <CardTitle>Network Visibility</CardTitle>

      {/* Opt-in prompt for contractors who haven't decided */}
      {showPrompt && (
        <div className="mt-4 p-4 bg-brand-gold/5 border border-brand-gold/20 rounded-lg">
          <p className="text-sm text-white mb-3">
            Your company has joined KeyHub Network. Would you like to be visible
            for cross-network job opportunities?
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Only your availability slots are shared — no personal or financial data
            crosses to other companies.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={handleAcceptAll}
              loading={saving === 'accept'}
              disabled={saving !== null}
            >
              Accept
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleDecline}
              loading={saving === 'decline'}
              disabled={saving !== null}
            >
              Decline
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDefer}
              loading={saving === 'defer'}
              disabled={saving !== null}
            >
              Decide Later
            </Button>
          </div>
        </div>
      )}

      {/* Opted-out message */}
      {isOptedOut && !hasDecided && (
        <div className="mt-4">
          <CardDescription>
            You declined network visibility. Contact your admin if you change your mind.
          </CardDescription>
        </div>
      )}

      {/* Deferred message */}
      {recentlyDismissed && !hasDecided && !isOptedOut && !alreadyOptedIn && (
        <div className="mt-4">
          <CardDescription>
            You chose to decide later. We&apos;ll ask again soon.
          </CardDescription>
        </div>
      )}

      {/* Per-network toggles for contractors who opted in */}
      {(alreadyOptedIn || hasDecided) && optedIn.size > 0 && (
        <>
          <CardDescription>
            Manage which networks you&apos;re visible in. Only your availability
            slots are shared — no personal or financial data.
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
        </>
      )}
    </Card>
  );
}

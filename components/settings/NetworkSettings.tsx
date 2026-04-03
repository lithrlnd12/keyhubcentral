'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks';
import { tenant } from '@/lib/config/tenant';
import {
  TenantNetworkConfig,
  DEFAULT_NETWORK_CONFIG,
} from '@/types/network';
import {
  subscribeToNetworkConfig,
  updateNetworkConfig,
  getNetworksForTenant,
} from '@/lib/firebase/network';
import { NetworkConnections } from './NetworkConnections';

// Toggle switch — matches NotificationSettings pattern
function Toggle({
  enabled,
  onChange,
  disabled = false,
}: {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full
        border-2 border-transparent transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-charcoal
        ${enabled ? 'bg-brand-gold' : 'bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full
          bg-white shadow ring-0 transition duration-200 ease-in-out
          ${enabled ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-center gap-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-brand-gold focus:ring-brand-gold focus:ring-offset-brand-charcoal"
      />
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export function NetworkSettings() {
  const { user } = useAuth();
  const [config, setConfig] = useState<TenantNetworkConfig>(DEFAULT_NETWORK_CONFIG);
  const [saving, setSaving] = useState(false);
  const [membersCount, setMembersCount] = useState(0);
  const [showConnections, setShowConnections] = useState(false);

  const isOwnerOrAdmin = user?.role && ['owner', 'admin'].includes(user.role);

  // Subscribe to network config
  useEffect(() => {
    const unsubscribe = subscribeToNetworkConfig(setConfig);
    return () => unsubscribe();
  }, []);

  // Get connected members count
  useEffect(() => {
    if (config.enabled && config.networkId) {
      getNetworksForTenant(tenant.firebaseProjectId).then((networks) => {
        const total = networks.reduce((sum, n) => sum + n.tenants.length, 0);
        // Subtract 1 for self
        setMembersCount(Math.max(0, total - 1));
      });
    } else {
      setMembersCount(0);
    }
  }, [config.enabled, config.networkId]);

  const handleToggleNetwork = async (enabled: boolean) => {
    setSaving(true);
    try {
      await updateNetworkConfig({ enabled });
    } catch (err) {
      console.error('Failed to update network config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleShareChange = async (key: 'contractors' | 'marketplace', checked: boolean) => {
    setSaving(true);
    try {
      await updateNetworkConfig({
        share: { ...config.share, [key]: checked },
      });
    } catch (err) {
      console.error('Failed to update share settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handlePullChange = async (key: 'contractors' | 'marketplace', checked: boolean) => {
    setSaving(true);
    try {
      await updateNetworkConfig({
        pull: { ...config.pull, [key]: checked },
      });
    } catch (err) {
      console.error('Failed to update pull settings:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOwnerOrAdmin) return null;

  if (showConnections) {
    return <NetworkConnections onClose={() => setShowConnections(false)} />;
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div>
          <CardTitle>KeyHub Network</CardTitle>
          <CardDescription>
            Connect with other {tenant.shortName} tenants to share contractors and marketplace listings
          </CardDescription>
        </div>
        <Toggle
          enabled={config.enabled}
          onChange={handleToggleNetwork}
          disabled={saving}
        />
      </div>

      {config.enabled && (
        <div className="space-y-6 mt-6 pt-6 border-t border-gray-700">
          {/* Share to network */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Share to network</h4>
            <div className="space-y-2 ml-1">
              <Checkbox
                checked={config.share.contractors}
                onChange={(checked) => handleShareChange('contractors', checked)}
                label="Available contractors"
                disabled={saving}
              />
              <Checkbox
                checked={config.share.marketplace}
                onChange={(checked) => handleShareChange('marketplace', checked)}
                label="Marketplace listings"
                disabled={saving}
              />
            </div>
          </div>

          {/* Pull from network */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">Pull from network</h4>
            <div className="space-y-2 ml-1">
              <Checkbox
                checked={config.pull.contractors}
                onChange={(checked) => handlePullChange('contractors', checked)}
                label="Available contractors"
                disabled={saving}
              />
              <Checkbox
                checked={config.pull.marketplace}
                onChange={(checked) => handlePullChange('marketplace', checked)}
                label="Open labor requests"
                disabled={saving}
              />
            </div>
          </div>

          {/* Connected members */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <div>
              <p className="text-sm text-gray-400">Connected network members</p>
              <p className="text-2xl font-bold text-white">{membersCount}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowConnections(true)}
            >
              Manage Connections
            </Button>
          </div>

          {/* Info box */}
          <div className="bg-gray-800/50 rounded-lg p-4 text-sm text-gray-400">
            <p className="font-medium text-gray-300 mb-2">How it works</p>
            <ul className="space-y-1 list-disc list-inside">
              <li>All connections are mutual — both tenants must agree</li>
              <li>Contractors opt-in individually to network visibility</li>
              <li>Only availability and marketplace listings are shared</li>
              <li>Customer data, jobs, financials, and communications are never shared</li>
            </ul>
          </div>
        </div>
      )}
    </Card>
  );
}

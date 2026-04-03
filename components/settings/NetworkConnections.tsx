'use client';

import { useState, useEffect } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/components/ui/Toast';
import { tenant } from '@/lib/config/tenant';
import { Network, ConnectionRequest } from '@/types/network';
import {
  createNetwork,
  getNetworksForTenant,
  getInboundRequests,
  getOutboundRequests,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeTenantFromNetwork,
  updateNetworkConfig,
} from '@/lib/firebase/network';

interface NetworkConnectionsProps {
  onClose: () => void;
}

export function NetworkConnections({ onClose }: NetworkConnectionsProps) {
  const { showToast } = useToast();
  const tenantId = tenant.firebaseProjectId;

  const [networks, setNetworks] = useState<Network[]>([]);
  const [inbound, setInbound] = useState<ConnectionRequest[]>([]);
  const [outbound, setOutbound] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Create network form
  const [showCreate, setShowCreate] = useState(false);
  const [networkName, setNetworkName] = useState('');

  // Send request form
  const [showInvite, setShowInvite] = useState(false);
  const [inviteTenantId, setInviteTenantId] = useState('');
  const [inviteNetworkId, setInviteNetworkId] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [nets, inReqs, outReqs] = await Promise.all([
        getNetworksForTenant(tenantId),
        getInboundRequests(tenantId),
        getOutboundRequests(tenantId),
      ]);
      setNetworks(nets);
      setInbound(inReqs);
      setOutbound(outReqs);
    } catch (err) {
      console.error('Failed to load network data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateNetwork = async () => {
    if (!networkName.trim()) return;
    setActionLoading('create');
    try {
      const networkId = await createNetwork(networkName.trim(), tenantId, {
        contractors: true,
        marketplace: true,
      });
      await updateNetworkConfig({ networkId });
      showToast(`Network "${networkName}" created`, 'success');
      setNetworkName('');
      setShowCreate(false);
      await loadData();
    } catch (err) {
      showToast('Failed to create network', 'error');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendInvite = async () => {
    if (!inviteTenantId.trim() || !inviteNetworkId) return;
    setActionLoading('invite');
    try {
      await sendConnectionRequest(
        inviteNetworkId,
        tenantId,
        inviteTenantId.trim(),
        inviteMessage.trim() || undefined
      );
      showToast('Connection request sent', 'success');
      setInviteTenantId('');
      setInviteMessage('');
      setShowInvite(false);
      await loadData();
    } catch (err) {
      showToast('Failed to send request', 'error');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await acceptConnectionRequest(requestId);
      showToast('Connection accepted', 'success');
      await loadData();
    } catch (err) {
      showToast('Failed to accept', 'error');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      await rejectConnectionRequest(requestId);
      showToast('Connection rejected', 'success');
      await loadData();
    } catch (err) {
      showToast('Failed to reject', 'error');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveNetwork = async (networkId: string) => {
    setActionLoading(networkId);
    try {
      await removeTenantFromNetwork(networkId, tenantId);
      showToast('Left network', 'success');
      await loadData();
    } catch (err) {
      showToast('Failed to leave network', 'error');
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Manage Connections</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Back to Settings
        </Button>
      </div>

      {/* My Networks */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <CardTitle>My Networks</CardTitle>
          {!showCreate && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              Create Network
            </Button>
          )}
        </div>

        {showCreate && (
          <div className="flex gap-2 mb-4 p-3 bg-gray-800/50 rounded-lg">
            <input
              type="text"
              value={networkName}
              onChange={(e) => setNetworkName(e.target.value)}
              placeholder="Network name"
              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
            />
            <Button
              size="sm"
              onClick={handleCreateNetwork}
              loading={actionLoading === 'create'}
            >
              Create
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        )}

        {networks.length === 0 ? (
          <p className="text-sm text-gray-500">
            Not part of any network yet. Create one or wait for an invite.
          </p>
        ) : (
          <div className="space-y-3">
            {networks.map((network) => (
              <div
                key={network.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="text-white font-medium">{network.name}</p>
                  <p className="text-sm text-gray-400">
                    {network.tenants.length} member{network.tenants.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setInviteNetworkId(network.id);
                      setShowInvite(true);
                    }}
                  >
                    Invite
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleLeaveNetwork(network.id)}
                    loading={actionLoading === network.id}
                  >
                    Leave
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Invite to Network */}
      {showInvite && (
        <Card>
          <CardTitle>Invite Tenant to Network</CardTitle>
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Tenant Project ID
              </label>
              <input
                type="text"
                value={inviteTenantId}
                onChange={(e) => setInviteTenantId(e.target.value)}
                placeholder="e.g. keyhub-acme"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">
                Message (optional)
              </label>
              <input
                type="text"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Would you like to join our network?"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
              />
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSendInvite}
                loading={actionLoading === 'invite'}
              >
                Send Invite
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowInvite(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Inbound Requests */}
      {inbound.length > 0 && (
        <Card>
          <CardTitle>Pending Requests</CardTitle>
          <div className="mt-4 space-y-3">
            {inbound.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="text-white text-sm">
                    From: <span className="font-medium">{req.fromTenantId}</span>
                  </p>
                  {req.message && (
                    <p className="text-sm text-gray-400 mt-1">{req.message}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAccept(req.id)}
                    loading={actionLoading === req.id}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleReject(req.id)}
                    loading={actionLoading === req.id}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Outbound Requests */}
      {outbound.length > 0 && (
        <Card>
          <CardTitle>Sent Requests</CardTitle>
          <div className="mt-4 space-y-3">
            {outbound.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="text-white text-sm">
                    To: <span className="font-medium">{req.toTenantId}</span>
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    req.status === 'pending'
                      ? 'bg-yellow-500/10 text-yellow-400'
                      : req.status === 'accepted'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

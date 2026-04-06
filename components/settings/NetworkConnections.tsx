'use client';

import { useState } from 'react';
import { Card, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useNetworkInvites } from '@/lib/hooks/useNetworkInvites';
import { autoEnrollContractorsInNetwork } from '@/lib/firebase/networkNotifications';
import { NetworkInvite } from '@/types/network';

export function NetworkConnections() {
  const { registry, inbound, outbound, loading, refresh } = useNetworkInvites(true);
  const [showRegistry, setShowRegistry] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);

  // Filter registry: exclude companies with pending/accepted invites
  const connectedOrPendingIds = new Set([
    ...inbound
      .filter((i) => i.status === 'pending' || i.status === 'accepted')
      .map((i) => i.fromTenantId),
    ...outbound
      .filter((i) => i.status === 'pending' || i.status === 'accepted')
      .map((i) => i.toTenantId),
  ]);
  const availableRegistry = registry.filter((r) => !connectedOrPendingIds.has(r.tenantId));

  const pendingInbound = inbound.filter((i) => i.status === 'pending');
  const pendingOutbound = outbound.filter((i) => i.status === 'pending');
  const activeConnections = [
    ...inbound.filter((i) => i.status === 'accepted'),
    ...outbound.filter((i) => i.status === 'accepted'),
  ];

  const handleSendInvite = async (toTenantId: string, toTenantName: string) => {
    setSendingTo(toTenantId);
    try {
      const res = await fetch('/api/network/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toTenantId, toTenantName }),
      });
      if (res.ok) {
        await refresh();
      }
    } catch (err) {
      console.error('Failed to send invite:', err);
    } finally {
      setSendingTo(null);
    }
  };

  const handleRespond = async (inviteId: string, action: 'accept' | 'reject') => {
    setRespondingTo(inviteId);
    try {
      const res = await fetch(`/api/network/invite/${inviteId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        if (action === 'accept') {
          const data = await res.json();
          // Auto-enroll all active contractors into the new network
          if (data.networkId) {
            await autoEnrollContractorsInNetwork([data.networkId]);
          }
        }
        await refresh();
      }
    } catch (err) {
      console.error('Failed to respond to invite:', err);
    } finally {
      setRespondingTo(null);
    }
  };

  const handleDisconnect = async (inviteId: string) => {
    setDisconnecting(inviteId);
    try {
      const res = await fetch(`/api/network/invite/${inviteId}/disconnect`, {
        method: 'POST',
      });
      if (res.ok) {
        setConfirmDisconnect(null);
        await refresh();
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    } finally {
      setDisconnecting(null);
    }
  };

  const getPartnerName = (invite: NetworkInvite, perspective: 'inbound' | 'outbound') => {
    return perspective === 'inbound' ? invite.fromTenantName : invite.toTenantName;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Browse & Invite */}
      <Card>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>Browse & Invite</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRegistry(!showRegistry)}
          >
            {showRegistry ? 'Hide' : 'Find Companies'}
          </Button>
        </div>
        {showRegistry && (
          <div className="mt-4 space-y-3">
            {availableRegistry.length === 0 ? (
              <p className="text-sm text-gray-500">
                No companies available to invite at this time.
              </p>
            ) : (
              availableRegistry.map((company) => (
                <div
                  key={company.tenantId}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{company.name}</p>
                    {company.domain && (
                      <p className="text-xs text-gray-400">{company.domain}</p>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    loading={sendingTo === company.tenantId}
                    disabled={sendingTo !== null}
                    onClick={() => handleSendInvite(company.tenantId, company.name)}
                  >
                    Send Invite
                  </Button>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Inbound Invites — always visible */}
      <Card>
        <CardTitle>Inbound Invites</CardTitle>
        <div className="mt-4 space-y-3">
          {pendingInbound.length === 0 ? (
            <p className="text-sm text-gray-500">
              No pending invites. When another company invites you to connect, it will appear here.
            </p>
          ) : (
            pendingInbound.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {getPartnerName(invite, 'inbound')}
                  </p>
                  {invite.message && (
                    <p className="text-xs text-gray-400 mt-1">{invite.message}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    loading={respondingTo === invite.id}
                    disabled={respondingTo !== null}
                    onClick={() => handleRespond(invite.id, 'accept')}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={respondingTo === invite.id}
                    disabled={respondingTo !== null}
                    onClick={() => handleRespond(invite.id, 'reject')}
                  >
                    Deny
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Outbound Invites */}
      {pendingOutbound.length > 0 && (
        <Card>
          <CardTitle>Outbound Invites</CardTitle>
          <div className="mt-4 space-y-3">
            {pendingOutbound.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    {getPartnerName(invite, 'outbound')}
                  </p>
                </div>
                <span className="text-xs font-medium text-brand-gold bg-brand-gold/10 px-2 py-1 rounded-full">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Active Connections */}
      {activeConnections.length > 0 && (
        <Card>
          <CardTitle>Active Connections</CardTitle>
          <div className="mt-4 space-y-3">
            {activeConnections.map((invite) => {
              const isInbound = inbound.some((i) => i.id === invite.id);
              const partnerName = getPartnerName(
                invite,
                isInbound ? 'inbound' : 'outbound'
              );
              const connectedDate = invite.respondedAt
                ? new Date(invite.respondedAt as unknown as string).toLocaleDateString()
                : '';

              return (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{partnerName}</p>
                    {connectedDate && (
                      <p className="text-xs text-gray-400">
                        Connected {connectedDate}
                      </p>
                    )}
                  </div>
                  {confirmDisconnect === invite.id ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">Disconnect?</span>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={disconnecting === invite.id}
                        onClick={() => handleDisconnect(invite.id)}
                      >
                        Yes
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmDisconnect(null)}
                      >
                        No
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDisconnect(invite.id)}
                    >
                      Disconnect
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

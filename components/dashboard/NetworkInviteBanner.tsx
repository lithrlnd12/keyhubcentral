'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Network, Check, X, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/hooks';
import { autoEnrollContractorsInNetwork } from '@/lib/firebase/networkNotifications';
import { ADMIN_ROLES } from '@/types/user';

interface PendingInvite {
  id: string;
  fromTenantId: string;
  fromTenantName: string;
  message?: string;
}

export function NetworkInviteBanner() {
  const { user } = useAuth();
  const router = useRouter();
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const isAdmin = user?.role && ADMIN_ROLES.includes(user.role);

  const fetchInvites = useCallback(async () => {
    try {
      const res = await fetch('/api/network/invite');
      if (res.ok) {
        const data = await res.json();
        setInvites(
          (data.inbound || []).filter(
            (i: PendingInvite & { status: string }) => i.status === 'pending'
          )
        );
      }
    } catch {
      // Silently fail — not critical for dashboard
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    fetchInvites();
    // Poll every 60s
    const interval = setInterval(fetchInvites, 60000);
    return () => clearInterval(interval);
  }, [isAdmin, fetchInvites]);

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
          router.push('/settings');
        }
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    } catch (err) {
      console.error('Failed to respond to network invite:', err);
    } finally {
      setRespondingTo(null);
    }
  };

  // Don't render if not admin, still loading, or no invites
  const visible = invites.filter((i) => !dismissed.has(i.id));
  if (!isAdmin || loading || visible.length === 0) return null;

  return (
    <div className="space-y-3">
      {visible.map((invite) => (
        <div
          key={invite.id}
          className="relative bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-blue-500/20 rounded-lg flex-shrink-0">
                <Network className="w-5 h-5 text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-white font-medium text-sm">
                  Network Invite from {invite.fromTenantName}
                </p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {invite.message || 'Wants to connect and share contractors & marketplace listings'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => handleRespond(invite.id, 'accept')}
                disabled={respondingTo !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {respondingTo === invite.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Accept
              </button>
              <button
                onClick={() => handleRespond(invite.id, 'reject')}
                disabled={respondingTo !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                Decline
              </button>
              <button
                onClick={() => setDismissed((prev) => new Set(prev).add(invite.id))}
                className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

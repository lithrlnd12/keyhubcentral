'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks';
import { Button } from '@/components/ui';
import { UserProfile, UserRole, UserStatus } from '@/types/user';
import { Partner } from '@/types/partner';
import { Check, X, Clock, User, Database, RefreshCw } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});
  const [selectedPartners, setSelectedPartners] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetchPendingUsers();
    fetchPartners();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('status', '==', 'pending'));
      const snapshot = await getDocs(q);
      const users = snapshot.docs.map((doc) => doc.data() as UserProfile);
      setPendingUsers(users);
      // Initialize default roles
      const defaultRoles: Record<string, UserRole> = {};
      users.forEach((u) => {
        defaultRoles[u.uid] = 'contractor';
      });
      setSelectedRoles((prev) => ({ ...defaultRoles, ...prev }));
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPartners = async () => {
    try {
      const q = query(collection(db, 'partners'), where('status', '==', 'active'), orderBy('companyName', 'asc'));
      const snapshot = await getDocs(q);
      const partnerList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Partner));
      setPartners(partnerList);
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const handleApprove = async (uid: string) => {
    const role = selectedRoles[uid] || 'contractor';
    const partnerId = role === 'partner' ? selectedPartners[uid] : null;

    // Validate partner selection
    if (role === 'partner' && !partnerId) {
      alert('Please select a partner company for this user');
      return;
    }

    try {
      // Update Firestore document
      const updateData: Record<string, unknown> = {
        status: 'active' as UserStatus,
        role,
        approvedAt: serverTimestamp(),
        approvedBy: user?.uid,
      };

      if (role === 'partner' && partnerId) {
        updateData.partnerId = partnerId;
      }

      await updateDoc(doc(db, 'users', uid), updateData);

      // Set custom claims for Storage rules
      await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role, callerUid: user?.uid }),
      });

      fetchPendingUsers();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  };

  const handleReject = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: 'inactive' as UserStatus,
      });
      fetchPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  };

  const handleSyncClaims = async () => {
    if (!user?.uid) return;
    setSyncing(true);
    try {
      const res = await fetch('/api/admin/sync-claims', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callerUid: user.uid }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Synced ${data.synced} users. ${data.failed} failed.`);
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error syncing claims:', error);
      alert('Failed to sync claims');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Admin</h2>
          <p className="text-gray-400 mt-1">User management and settings</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSyncClaims}
            disabled={syncing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Permissions'}
          </Button>
          <Link href="/admin/seed">
            <Button variant="outline">
              <Database className="w-4 h-4 mr-2" />
              Seed Test Data
            </Button>
          </Link>
        </div>
      </div>

      {/* Pending Approvals */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-gold" />
            Pending Approvals
            {pendingUsers.length > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-brand-gold/20 text-brand-gold text-xs rounded-full">
                {pendingUsers.length}
              </span>
            )}
          </h3>
        </div>

        {loading ? (
          <div className="p-6 text-center text-gray-400">Loading...</div>
        ) : pendingUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-400">
            No pending approvals
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {pendingUsers.map((pendingUser) => (
              <div key={pendingUser.uid} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-black rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{pendingUser.displayName}</p>
                    <p className="text-sm text-gray-400">{pendingUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    className="bg-brand-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                    value={selectedRoles[pendingUser.uid] || 'contractor'}
                    onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [pendingUser.uid]: e.target.value as UserRole }))}
                  >
                    <option value="contractor">Contractor</option>
                    <option value="sales_rep">Sales Rep</option>
                    <option value="pm">Project Manager</option>
                    <option value="partner">Partner</option>
                    <option value="admin">Admin</option>
                  </select>
                  {selectedRoles[pendingUser.uid] === 'partner' && (
                    <select
                      className="bg-brand-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                      value={selectedPartners[pendingUser.uid] || ''}
                      onChange={(e) => setSelectedPartners((prev) => ({ ...prev, [pendingUser.uid]: e.target.value }))}
                    >
                      <option value="">Select Company...</option>
                      {partners.map((p) => (
                        <option key={p.id} value={p.id}>{p.companyName}</option>
                      ))}
                    </select>
                  )}
                  <Button
                    size="sm"
                    onClick={() => handleApprove(pendingUser.uid)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleReject(pendingUser.uid)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks';
import { Button } from '@/components/ui';
import { UserProfile, UserRole, UserStatus } from '@/types/user';
import { Partner } from '@/types/partner';
import { Check, X, Clock, User, Database, RefreshCw, Users, Shield, Ban, Search } from 'lucide-react';

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  sales_rep: 'Sales Rep',
  contractor: 'Contractor',
  pm: 'Project Manager',
  subscriber: 'Subscriber',
  partner: 'Partner',
  pending: 'Pending',
};

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-red-500/20 text-red-400',
  sales_rep: 'bg-blue-500/20 text-blue-400',
  contractor: 'bg-green-500/20 text-green-400',
  pm: 'bg-yellow-500/20 text-yellow-400',
  subscriber: 'bg-gray-500/20 text-gray-400',
  partner: 'bg-orange-500/20 text-orange-400',
  pending: 'bg-gray-500/20 text-gray-400',
};

export default function AdminPage() {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<UserProfile[]>([]);
  const [activeUsers, setActiveUsers] = useState<UserProfile[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, UserRole>>({});
  const [selectedPartners, setSelectedPartners] = useState<Record<string, string>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');

  useEffect(() => {
    fetchPendingUsers();
    fetchActiveUsers();
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

  const fetchActiveUsers = async () => {
    try {
      const q = query(collection(db, 'users'), where('status', 'in', ['active', 'inactive', 'suspended']));
      const snapshot = await getDocs(q);
      const users = snapshot.docs
        .map((doc) => doc.data() as UserProfile)
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      setActiveUsers(users);
      // Initialize roles for editing
      const userRoles: Record<string, UserRole> = {};
      users.forEach((u) => {
        userRoles[u.uid] = u.role;
      });
      setSelectedRoles((prev) => ({ ...prev, ...userRoles }));
    } catch (error) {
      console.error('Error fetching active users:', error);
    }
  };

  const fetchPartners = async () => {
    try {
      const q = query(collection(db, 'partners'), where('status', '==', 'active'));
      const snapshot = await getDocs(q);
      const partnerList = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Partner))
        .sort((a, b) => a.companyName.localeCompare(b.companyName));
      setPartners(partnerList);
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const handleApprove = async (uid: string) => {
    const role = selectedRoles[uid] || 'contractor';
    const partnerId = role === 'partner' ? selectedPartners[uid] : null;

    if (role === 'partner' && !partnerId) {
      alert('Please select a partner company for this user');
      return;
    }

    setProcessing(uid);
    try {
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

      await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role, callerUid: user?.uid }),
      });

      fetchPendingUsers();
      fetchActiveUsers();
    } catch (error) {
      console.error('Error approving user:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (uid: string) => {
    setProcessing(uid);
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: 'inactive' as UserStatus,
      });
      fetchPendingUsers();
    } catch (error) {
      console.error('Error rejecting user:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleToggleStatus = async (uid: string, currentStatus: UserStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setProcessing(uid);
    try {
      await updateDoc(doc(db, 'users', uid), {
        status: newStatus,
      });
      fetchActiveUsers();
    } catch (error) {
      console.error('Error toggling user status:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleRoleChange = async (uid: string) => {
    const role = selectedRoles[uid];
    const partnerId = role === 'partner' ? selectedPartners[uid] : null;

    if (role === 'partner' && !partnerId) {
      alert('Please select a partner company for this user');
      return;
    }

    setProcessing(uid);
    try {
      const updateData: Record<string, unknown> = { role };

      if (role === 'partner' && partnerId) {
        updateData.partnerId = partnerId;
      } else {
        updateData.partnerId = null;
      }

      await updateDoc(doc(db, 'users', uid), updateData);

      await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, role, callerUid: user?.uid }),
      });

      setEditingUserId(null);
      fetchActiveUsers();
    } catch (error) {
      console.error('Error changing role:', error);
    } finally {
      setProcessing(null);
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

  // Filter active users
  const filteredUsers = activeUsers.filter((u) => {
    const matchesSearch =
      !searchTerm ||
      u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

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
              <div key={pendingUser.uid} className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-black rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{pendingUser.displayName}</p>
                    <p className="text-sm text-gray-400">{pendingUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
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
                    disabled={processing === pendingUser.uid}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleReject(pendingUser.uid)}
                    disabled={processing === pendingUser.uid}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Users Management */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800">
        <div className="p-4 border-b border-gray-800">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-gold" />
            All Users
            <span className="ml-2 px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
              {activeUsers.length}
            </span>
          </h3>
        </div>

        {/* Search and Filter */}
        <div className="p-4 border-b border-gray-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
            className="bg-brand-black border border-gray-700 rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="pm">Project Manager</option>
            <option value="sales_rep">Sales Rep</option>
            <option value="contractor">Contractor</option>
            <option value="partner">Partner</option>
          </select>
        </div>

        {/* Users List */}
        <div className="divide-y divide-gray-800 max-h-[500px] overflow-y-auto">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center text-gray-400">
              No users found
            </div>
          ) : (
            filteredUsers.map((activeUser) => (
              <div key={activeUser.uid} className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-black rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{activeUser.displayName}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[activeUser.role]}`}>
                          {ROLE_LABELS[activeUser.role]}
                        </span>
                        {activeUser.status !== 'active' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                            {activeUser.status}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">{activeUser.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingUserId === activeUser.uid ? (
                      <>
                        <select
                          className="bg-brand-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                          value={selectedRoles[activeUser.uid] || activeUser.role}
                          onChange={(e) => setSelectedRoles((prev) => ({ ...prev, [activeUser.uid]: e.target.value as UserRole }))}
                        >
                          <option value="contractor">Contractor</option>
                          <option value="sales_rep">Sales Rep</option>
                          <option value="pm">Project Manager</option>
                          <option value="partner">Partner</option>
                          <option value="admin">Admin</option>
                        </select>
                        {selectedRoles[activeUser.uid] === 'partner' && (
                          <select
                            className="bg-brand-black border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white"
                            value={selectedPartners[activeUser.uid] || activeUser.partnerId || ''}
                            onChange={(e) => setSelectedPartners((prev) => ({ ...prev, [activeUser.uid]: e.target.value }))}
                          >
                            <option value="">Select Company...</option>
                            {partners.map((p) => (
                              <option key={p.id} value={p.id}>{p.companyName}</option>
                            ))}
                          </select>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleRoleChange(activeUser.uid)}
                          disabled={processing === activeUser.uid}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingUserId(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingUserId(activeUser.uid);
                            setSelectedRoles((prev) => ({ ...prev, [activeUser.uid]: activeUser.role }));
                            if (activeUser.partnerId) {
                              setSelectedPartners((prev) => ({ ...prev, [activeUser.uid]: activeUser.partnerId! }));
                            }
                          }}
                          title="Change Role"
                        >
                          <Shield className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={activeUser.status === 'active' ? 'danger' : 'outline'}
                          onClick={() => handleToggleStatus(activeUser.uid, activeUser.status)}
                          disabled={processing === activeUser.uid || activeUser.role === 'owner'}
                          title={activeUser.status === 'active' ? 'Disable Access' : 'Enable Access'}
                        >
                          <Ban className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

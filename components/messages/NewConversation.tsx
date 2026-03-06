'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, X, Users, Check, Loader2 } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks';
import { useCreateConversation } from '@/lib/hooks/useMessages';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/types/user';

interface UserEntry {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  phone: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  sales_rep: 'Sales Rep',
  contractor: 'Contractor',
  pm: 'Project Manager',
  subscriber: 'Subscriber',
  partner: 'Partner',
};

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-500/20 text-purple-400',
  admin: 'bg-red-500/20 text-red-400',
  sales_rep: 'bg-blue-500/20 text-blue-400',
  contractor: 'bg-green-500/20 text-green-400',
  pm: 'bg-yellow-500/20 text-yellow-400',
  subscriber: 'bg-cyan-500/20 text-cyan-400',
  partner: 'bg-orange-500/20 text-orange-400',
};

export function NewConversation() {
  const router = useRouter();
  const { user } = useAuth();
  const { create, creating } = useCreateConversation();

  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selected, setSelected] = useState<UserEntry[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Fetch all active users
  useEffect(() => {
    async function fetchUsers() {
      const q = query(
        collection(db, 'users'),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() } as UserEntry))
        .filter((u) => u.uid !== user?.uid)
        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      setUsers(results);
      setLoadingUsers(false);
    }
    fetchUsers();
  }, [user?.uid]);

  // Filter users
  const filtered = useMemo(() => {
    let result = users;
    if (roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.displayName.toLowerCase().includes(lower) ||
          u.email.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [users, roleFilter, search]);

  // Available roles for filter
  const availableRoles = useMemo(() => {
    const roles = new Set(users.map((u) => u.role));
    return Array.from(roles).sort();
  }, [users]);

  // Toggle selection
  const toggleSelect = (userEntry: UserEntry) => {
    setSelected((prev) => {
      const exists = prev.find((u) => u.uid === userEntry.uid);
      if (exists) return prev.filter((u) => u.uid !== userEntry.uid);
      return [...prev, userEntry];
    });
  };

  // Auto-switch to group mode when selecting multiple
  useEffect(() => {
    if (selected.length > 1 && !isGroup) setIsGroup(true);
    if (selected.length <= 1 && isGroup) setIsGroup(false);
  }, [selected.length, isGroup]);

  // Start conversation
  const handleStart = async () => {
    if (selected.length === 0 || creating) return;

    const participants = selected.map((u) => u.uid);
    const participantNames: Record<string, string> = {};
    for (const u of selected) {
      participantNames[u.uid] = u.displayName;
    }

    const type = selected.length === 1 ? '1:1' : 'group';
    const convId = await create(type, participants, participantNames, groupName || undefined);

    if (convId) {
      router.push(`/messages/${convId}`);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => router.push('/messages')}
            className="p-1 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-400" />
          </button>
          <h2 className="text-lg font-semibold text-white">New Message</h2>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full bg-gray-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder-gray-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* Role filter */}
        <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
          <button
            onClick={() => setRoleFilter('all')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              roleFilter === 'all'
                ? 'bg-brand-gold text-brand-black'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            All
          </button>
          {availableRoles.map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role === roleFilter ? 'all' : role)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
                roleFilter === role
                  ? 'bg-brand-gold text-brand-black'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              )}
            >
              {ROLE_LABELS[role] || role}
            </button>
          ))}
        </div>
      </div>

      {/* Selected users */}
      {selected.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50">
          <div className="flex flex-wrap gap-2 items-center">
            {selected.map((u) => (
              <span
                key={u.uid}
                className="inline-flex items-center gap-1 bg-brand-gold/20 text-brand-gold px-2 py-1 rounded-full text-xs"
              >
                {u.displayName}
                <button onClick={() => toggleSelect(u)}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          {/* Group name input */}
          {selected.length > 1 && (
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="mt-2 w-full bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder-gray-500"
            />
          )}
        </div>
      )}

      {/* User list */}
      <div className="flex-1 overflow-y-auto">
        {loadingUsers ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
            No users found
          </div>
        ) : (
          filtered.map((userEntry) => {
            const isSelected = selected.some((u) => u.uid === userEntry.uid);
            return (
              <button
                key={userEntry.uid}
                onClick={() => toggleSelect(userEntry)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left transition-colors',
                  isSelected ? 'bg-brand-gold/10' : 'hover:bg-gray-800/50'
                )}
              >
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-medium text-gray-300">
                    {userEntry.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {userEntry.displayName}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', ROLE_COLORS[userEntry.role] || 'bg-gray-700 text-gray-400')}>
                      {ROLE_LABELS[userEntry.role] || userEntry.role}
                    </span>
                    <span className="text-xs text-gray-500 truncate">{userEntry.email}</span>
                  </div>
                </div>

                {/* Check */}
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-brand-gold flex items-center justify-center flex-shrink-0">
                    <Check className="w-4 h-4 text-brand-black" />
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Start button */}
      {selected.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-800 safe-area-bottom">
          <button
            onClick={handleStart}
            disabled={creating}
            className="w-full bg-brand-gold text-brand-black font-semibold py-3 rounded-xl hover:bg-brand-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {creating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : selected.length === 1 ? (
              `Message ${selected[0].displayName}`
            ) : (
              <>
                <Users className="w-4 h-4" />
                Start Group ({selected.length} people)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { X, Search, Check, Loader2, Users } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { findExistingGroup, createConversation } from '@/lib/firebase/messages';
import { useAuth } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types/message';
import type { UserRole } from '@/types/user';

interface UserEntry {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
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

interface AddPeopleSheetProps {
  conversation: Conversation;
  onClose: () => void;
}

export function AddPeopleSheet({ conversation, onClose }: AddPeopleSheetProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const [groupName, setGroupName] = useState('');

  // Fetch all active users (excluding current participants)
  useEffect(() => {
    async function fetchUsers() {
      const q = query(
        collection(db, 'users'),
        where('status', '==', 'active')
      );
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() } as UserEntry))
        .filter((u) => !conversation.participants.includes(u.uid))
        .sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      setUsers(results);
      setLoadingUsers(false);
    }
    fetchUsers();
  }, [conversation.participants]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const lower = search.toLowerCase();
    return users.filter(
      (u) =>
        u.displayName.toLowerCase().includes(lower) ||
        u.email.toLowerCase().includes(lower)
    );
  }, [users, search]);

  const toggleSelect = (userEntry: UserEntry) => {
    setSelected((prev) => {
      const exists = prev.find((u) => u.uid === userEntry.uid);
      if (exists) return prev.filter((u) => u.uid !== userEntry.uid);
      return [...prev, userEntry];
    });
  };

  // Create new group with current participants + selected people
  // If that exact group exists, navigate to it instead
  const handleCreate = async () => {
    if (selected.length === 0 || creating || !user?.uid) return;
    setCreating(true);

    try {
      // Build full participant list: current conversation members + new selections
      const allParticipantIds = [
        ...conversation.participants,
        ...selected.map((u) => u.uid),
      ];

      // Check if a group with this exact set already exists
      const existing = await findExistingGroup(allParticipantIds, user.uid);
      if (existing) {
        router.push(`/messages/${existing.id}`);
        onClose();
        return;
      }

      // Build names map
      const participantNames: Record<string, string> = {
        ...conversation.participantNames,
      };
      for (const u of selected) {
        participantNames[u.uid] = u.displayName;
      }
      if (user.uid && user.displayName) {
        participantNames[user.uid] = user.displayName;
      }

      // Create new group
      const convId = await createConversation(
        'group',
        allParticipantIds,
        participantNames,
        user.uid,
        groupName || undefined
      );

      router.push(`/messages/${convId}`);
      onClose();
    } catch (error) {
      console.error('Failed to create group:', error);
    } finally {
      setCreating(false);
    }
  };

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-brand-black border border-gray-700 rounded-t-2xl md:rounded-xl w-full md:max-w-md max-h-[80vh] flex flex-col">
        {/* Handle + Header */}
        <div className="flex-shrink-0 pt-3 pb-2 px-4">
          <div className="w-10 h-1 bg-gray-600 rounded-full mx-auto mb-3 md:hidden" />
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold text-white">Add People</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Current participants preview */}
          <div className="flex flex-wrap gap-1 mb-3">
            {Object.entries(conversation.participantNames)
              .filter(([uid]) => uid !== user?.uid)
              .map(([uid, name]) => (
                <span
                  key={uid}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400"
                >
                  {name}
                </span>
              ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people to add..."
              className="w-full bg-gray-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder-gray-500"
              autoFocus
            />
          </div>
        </div>

        {/* Selected chips */}
        {selected.length > 0 && (
          <div className="flex-shrink-0 px-4 py-2 border-t border-gray-800">
            <div className="flex flex-wrap gap-1.5">
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
            {/* Group name for the new group */}
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name (optional)"
              className="mt-2 w-full bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-gold placeholder-gray-500"
            />
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
              {search ? 'No matches found' : 'No more people to add'}
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
                  <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-medium text-gray-300">
                      {userEntry.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {userEntry.displayName}
                    </p>
                    <span
                      className={cn(
                        'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                        ROLE_COLORS[userEntry.role] || 'bg-gray-700 text-gray-400'
                      )}
                    >
                      {ROLE_LABELS[userEntry.role] || userEntry.role}
                    </span>
                  </div>
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

        {/* Action button */}
        {selected.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-800 safe-area-bottom">
            <button
              onClick={handleCreate}
              disabled={creating}
              className="w-full bg-brand-gold text-brand-black font-semibold py-3 rounded-xl hover:bg-brand-gold-light transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {creating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Create Group ({conversation.participants.length + selected.length} people)
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

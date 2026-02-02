'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Contractor } from '@/types/contractor';
import { UserProfile } from '@/types/user';
import { useAuth } from '@/lib/hooks/useAuth';
import { canManageUsers } from '@/types/user';
import { updateContractor } from '@/lib/firebase/contractors';
import { getUserProfile } from '@/lib/firebase/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User, Link, Unlink, Search, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface ContractorUserLinkProps {
  contractor: Contractor;
  onUpdate?: () => void;
}

export function ContractorUserLink({ contractor, onUpdate }: ContractorUserLinkProps) {
  const { user } = useAuth();
  const [linkedUser, setLinkedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = user?.role && canManageUsers(user.role);

  // Load linked user profile
  useEffect(() => {
    async function loadLinkedUser() {
      if (contractor.userId) {
        try {
          const profile = await getUserProfile(contractor.userId);
          setLinkedUser(profile);
        } catch (err) {
          console.error('Error loading linked user:', err);
        }
      }
      setLoading(false);
    }
    loadLinkedUser();
  }, [contractor.userId]);

  // Search for users by email or name
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      // Search by email
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', searchQuery.trim().toLowerCase()),
        limit(5)
      );
      const emailResults = await getDocs(emailQuery);

      // Search by displayName (starts with)
      const nameQuery = query(
        collection(db, 'users'),
        where('displayName', '>=', searchQuery.trim()),
        where('displayName', '<=', searchQuery.trim() + '\uf8ff'),
        limit(5)
      );
      const nameResults = await getDocs(nameQuery);

      // Combine results, remove duplicates
      const usersMap = new Map<string, UserProfile>();

      emailResults.docs.forEach(doc => {
        usersMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
      });

      nameResults.docs.forEach(doc => {
        if (!usersMap.has(doc.id)) {
          usersMap.set(doc.id, { uid: doc.id, ...doc.data() } as UserProfile);
        }
      });

      const users = Array.from(usersMap.values());

      if (users.length === 0) {
        setError('No users found matching that search');
      }

      setSearchResults(users);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  // Link a user to this contractor
  const handleLink = async (userId: string) => {
    setLinking(true);
    setError(null);
    setSuccess(null);

    try {
      await updateContractor(contractor.id, { userId });

      // Load the new linked user
      const profile = await getUserProfile(userId);
      setLinkedUser(profile);
      setSearchResults([]);
      setSearchQuery('');
      setSuccess('User linked successfully!');
      onUpdate?.();

      // Clear success after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error linking user:', err);
      setError('Failed to link user');
    } finally {
      setLinking(false);
    }
  };

  // Unlink the current user
  const handleUnlink = async () => {
    if (!confirm('Are you sure you want to unlink this user? They will lose access to the contractor portal.')) {
      return;
    }

    setLinking(true);
    setError(null);

    try {
      await updateContractor(contractor.id, { userId: undefined });
      setLinkedUser(null);
      setSuccess('User unlinked successfully');
      onUpdate?.();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error unlinking user:', err);
      setError('Failed to unlink user');
    } finally {
      setLinking(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="w-5 h-5 text-brand-gold" />
          User Account Link
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Link Status */}
        <div className="p-4 bg-gray-800/50 rounded-lg">
          <p className="text-sm text-gray-400 mb-2">Linked User Account</p>
          {loading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading...</span>
            </div>
          ) : linkedUser ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-gold/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-brand-gold" />
                </div>
                <div>
                  <p className="text-white font-medium">{linkedUser.displayName || 'No name'}</p>
                  <p className="text-sm text-gray-400">{linkedUser.email}</p>
                  <p className="text-xs text-gray-500">UID: {linkedUser.uid}</p>
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={handleUnlink}
                disabled={linking}
              >
                <Unlink className="w-4 h-4 mr-1" />
                Unlink
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              <span>No user account linked</span>
            </div>
          )}
        </div>

        {/* Search & Link Section */}
        <div className="space-y-3">
          <p className="text-sm text-gray-400">
            {linkedUser ? 'Link a different user:' : 'Search for a user to link:'}
          </p>

          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by email or name..."
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button
              onClick={handleSearch}
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((result) => (
                <div
                  key={result.uid}
                  className="flex items-center justify-between p-3 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm">{result.displayName || 'No name'}</p>
                      <p className="text-xs text-gray-400">{result.email}</p>
                      <p className="text-xs text-gray-500">
                        Role: {result.role} • Status: {result.status}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLink(result.uid)}
                    disabled={linking}
                  >
                    {linking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Link className="w-4 h-4 mr-1" />
                        Link
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {error && (
          <div className="flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-400 text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>{success}</span>
          </div>
        )}

        {/* Help Text */}
        <p className="text-xs text-gray-500">
          Linking a user account allows them to access the contractor portal, view their jobs,
          manage availability, and sync with Google Calendar.
        </p>
      </CardContent>
    </Card>
  );
}

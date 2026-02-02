'use client';

import { useState, useEffect } from 'react';
import { getUserProfile } from '@/lib/firebase/auth';
import { UserProfile } from '@/types/user';

interface UseUserByIdReturn {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
}

export function useUserById(userId: string | null | undefined): UseUserByIdReturn {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const uid = userId; // Capture for closure

    async function fetchUser() {
      try {
        setLoading(true);
        setError(null);
        const profile = await getUserProfile(uid);
        if (!cancelled) {
          setUser(profile);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch user');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { user, loading, error };
}

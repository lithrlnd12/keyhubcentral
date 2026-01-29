'use client';

import { useState, useEffect, useCallback } from 'react';
import { getUsersByRole, getUsersByRoles, UserWithDistance } from '@/lib/firebase/auth';
import { UserRole } from '@/types/user';

interface UseUsersByRoleOptions {
  roles?: UserRole[];
  role?: UserRole;
  coordinates?: { lat: number; lng: number };
  maxDistanceMiles?: number;
}

interface UseUsersByRoleReturn {
  users: UserWithDistance[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useUsersByRole(options: UseUsersByRoleOptions = {}): UseUsersByRoleReturn {
  const { roles, role, coordinates, maxDistanceMiles } = options;

  const [users, setUsers] = useState<UserWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize roles array for stable dependency comparison
  const rolesKey = roles ? roles.join(',') : '';
  const coordLat = coordinates?.lat;
  const coordLng = coordinates?.lng;

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const fetchOptions = coordLat && coordLng
        ? { coordinates: { lat: coordLat, lng: coordLng }, maxDistanceMiles }
        : undefined;

      let data: UserWithDistance[];
      if (rolesKey) {
        const rolesArray = rolesKey.split(',') as UserRole[];
        data = await getUsersByRoles(rolesArray, fetchOptions);
      } else if (role) {
        data = await getUsersByRole(role, fetchOptions);
      } else {
        data = [];
      }

      // Already sorted by distance if coordinates provided, otherwise sort by name
      if (!fetchOptions) {
        data.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));
      }
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [rolesKey, role, coordLat, coordLng, maxDistanceMiles]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    loading,
    error,
    refetch: fetchUsers,
  };
}

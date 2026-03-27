'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getMutationQueue, getPhotoQueue } from './offlineStore';
import { syncAll } from './syncManager';

export interface OfflineStatusState {
  isOnline: boolean;
  pendingMutations: number;
  pendingPhotos: number;
  lastSyncAt: number | null;
  isSyncing: boolean;
  syncNow: () => Promise<void>;
}

export function useOfflineStatus(): OfflineStatusState {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingMutations, setPendingMutations] = useState<number>(0);
  const [pendingPhotos, setPendingPhotos] = useState<number>(0);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const syncInProgress = useRef(false);

  // Refresh pending counts from IndexedDB
  const refreshCounts = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const [mutations, photos] = await Promise.all([
        getMutationQueue(),
        getPhotoQueue(),
      ]);
      setPendingMutations(mutations.length);
      setPendingPhotos(photos.length);
    } catch (err) {
      console.error('[useOfflineStatus] Failed to refresh counts:', err);
    }
  }, []);

  // Sync now handler — processes queues and refreshes counts
  const syncNow = useCallback(async () => {
    if (syncInProgress.current) return;
    if (typeof window === 'undefined') return;
    if (!navigator.onLine) return;

    syncInProgress.current = true;
    setIsSyncing(true);

    try {
      await syncAll();
      setLastSyncAt(Date.now());
    } catch (err) {
      console.error('[useOfflineStatus] Sync failed:', err);
    } finally {
      setIsSyncing(false);
      syncInProgress.current = false;
      await refreshCounts();
    }
  }, [refreshCounts]);

  // Initialize online state and listen for changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncNow]);

  // Poll pending counts periodically (every 5 seconds)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    refreshCounts();
    const interval = setInterval(refreshCounts, 5000);

    return () => clearInterval(interval);
  }, [refreshCounts]);

  return {
    isOnline,
    pendingMutations,
    pendingPhotos,
    lastSyncAt,
    isSyncing,
    syncNow,
  };
}

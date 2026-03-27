'use client';

import { useState, useEffect, useRef } from 'react';
import { useOfflineStatus } from '@/lib/offline/useOfflineStatus';
import OfflineSyncProgress from './OfflineSyncProgress';

export default function OfflineIndicator() {
  const {
    isOnline,
    pendingMutations,
    pendingPhotos,
    isSyncing,
    syncNow,
    lastSyncAt,
  } = useOfflineStatus();

  const [showSyncedMessage, setShowSyncedMessage] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const wasOffline = useRef(false);
  const prevSyncing = useRef(false);

  const totalPending = pendingMutations + pendingPhotos;

  // Track offline -> online transition for "Back online" flash
  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
    }
  }, [isOnline]);

  // Show "Synced!" message after sync completes when coming back online
  useEffect(() => {
    if (prevSyncing.current && !isSyncing && isOnline && wasOffline.current) {
      wasOffline.current = false;
      setShowSyncedMessage(true);
      const timer = setTimeout(() => {
        setShowSyncedMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    prevSyncing.current = isSyncing;
  }, [isSyncing, isOnline]);

  // Nothing to show when online with no pending items and no messages
  if (isOnline && totalPending === 0 && !showSyncedMessage && !isSyncing) {
    return null;
  }

  // Determine bar state
  let bgColor = 'bg-amber-500 dark:bg-amber-600';
  let message = "You're offline — changes will sync when connected";

  if (isOnline && isSyncing) {
    bgColor = 'bg-green-500 dark:bg-green-600';
    message = 'Back online — syncing...';
  } else if (isOnline && showSyncedMessage) {
    bgColor = 'bg-green-500 dark:bg-green-600';
    message = 'Synced!';
  } else if (isOnline && totalPending > 0) {
    bgColor = 'bg-amber-500 dark:bg-amber-600';
    message = `${totalPending} update${totalPending !== 1 ? 's' : ''} pending`;
  }

  return (
    <>
      <div
        className={`fixed top-0 left-0 right-0 z-50 ${bgColor} text-white text-sm transition-all duration-300`}
      >
        <div
          className="flex items-center justify-between px-4 py-1.5 cursor-pointer"
          onClick={() => {
            if (totalPending > 0 || !isOnline) {
              setExpanded(!expanded);
            }
          }}
        >
          <div className="flex items-center gap-2">
            {/* Status icon */}
            {!isOnline && (
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M12 9v4m0 4h.01"
                />
              </svg>
            )}
            {isOnline && isSyncing && (
              <svg
                className="w-4 h-4 flex-shrink-0 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            )}
            {isOnline && showSyncedMessage && (
              <svg
                className="w-4 h-4 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            )}
            <span>{message}</span>
          </div>

          {/* Pending count badge */}
          {totalPending > 0 && !isSyncing && (
            <div className="flex items-center gap-2">
              <span className="bg-white/20 rounded-full px-2 py-0.5 text-xs font-medium">
                {totalPending} pending
              </span>
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed bar */}
      {(totalPending > 0 || !isOnline || showSyncedMessage || isSyncing) && (
        <div className="h-9" />
      )}

      {/* Expanded sync progress panel */}
      {expanded && (
        <OfflineSyncProgress
          onClose={() => setExpanded(false)}
          syncNow={syncNow}
          isSyncing={isSyncing}
          lastSyncAt={lastSyncAt}
        />
      )}
    </>
  );
}

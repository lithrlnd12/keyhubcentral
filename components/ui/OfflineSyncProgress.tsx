'use client';

import { useState, useEffect } from 'react';
import {
  getMutationQueue,
  getPhotoQueue,
  OfflineMutation,
  OfflinePhoto,
} from '@/lib/offline/offlineStore';

interface OfflineSyncProgressProps {
  onClose: () => void;
  syncNow: () => Promise<void>;
  isSyncing: boolean;
  lastSyncAt: number | null;
}

export default function OfflineSyncProgress({
  onClose,
  syncNow,
  isSyncing,
  lastSyncAt,
}: OfflineSyncProgressProps) {
  const [mutations, setMutations] = useState<OfflineMutation[]>([]);
  const [photos, setPhotos] = useState<OfflinePhoto[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const [m, p] = await Promise.all([getMutationQueue(), getPhotoQueue()]);
        setMutations(m);
        setPhotos(p);
      } catch (err) {
        console.error('[OfflineSyncProgress] Failed to load queues:', err);
      }
    }
    load();

    // Refresh while panel is open
    const interval = setInterval(load, 2000);
    return () => clearInterval(interval);
  }, [isSyncing]);

  const totalItems = mutations.length + photos.length;

  function formatTime(ts: number): string {
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function formatMutationType(type: string): string {
    switch (type) {
      case 'job_status_update':
        return 'Status Update';
      case 'job_note_add':
        return 'Note Added';
      default:
        return type;
    }
  }

  return (
    <div className="fixed top-9 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-lg max-h-80 overflow-y-auto">
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Offline Queue ({totalItems} item{totalItems !== 1 ? 's' : ''})
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={syncNow}
              disabled={isSyncing || !navigator.onLine}
              className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Last sync info */}
        {lastSyncAt && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Last synced: {formatTime(lastSyncAt)}
          </p>
        )}

        {/* Mutation queue */}
        {mutations.length > 0 && (
          <div className="mb-3">
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Updates ({mutations.length})
            </h4>
            <div className="space-y-1">
              {mutations.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatMutationType(m.type)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {m.docId.slice(0, 8)}...
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {formatTime(m.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Photo queue */}
        {photos.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">
              Photos ({photos.length})
            </h4>
            <div className="space-y-1">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded px-3 py-2 text-sm"
                >
                  {/* Thumbnail preview */}
                  <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-gray-200 dark:bg-gray-700">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={p.dataUrl}
                      alt={p.caption || p.fileName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-700 dark:text-gray-300 truncate">
                      {p.fileName}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Job: {p.jobId.slice(0, 8)}...
                      {p.caption && ` — ${p.caption}`}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {formatTime(p.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {totalItems === 0 && (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
            No pending items in queue
          </p>
        )}
      </div>
    </div>
  );
}

'use client';

import { useCallback } from 'react';
import { updateJob } from '@/lib/firebase/jobs';
import { uploadJobPhoto } from '@/lib/firebase/storage';
import { queueMutation, queuePhoto } from './offlineStore';

export interface UseOfflineJobReturn {
  updateJobStatus: (
    jobId: string,
    status: string,
    notes?: string
  ) => Promise<void>;
  addJobPhoto: (
    jobId: string,
    dataUrl: string,
    fileName: string,
    caption?: string
  ) => Promise<void>;
}

/**
 * Hook for offline-aware job operations.
 * When online, operations go directly to Firebase.
 * When offline, operations are queued in IndexedDB for later sync.
 */
export function useOfflineJob(): UseOfflineJobReturn {
  const updateJobStatus = useCallback(
    async (jobId: string, status: string, notes?: string) => {
      const isOnline =
        typeof window !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        // Online: update Firebase directly
        try {
          await updateJob(jobId, { status: status as Parameters<typeof updateJob>[1]['status'] });
          return;
        } catch (err) {
          console.warn(
            '[useOfflineJob] Online update failed, queueing offline:',
            err
          );
          // Fall through to offline queue
        }
      }

      // Offline or online-but-failed: queue mutation
      await queueMutation({
        type: 'job_status_update',
        collection: 'jobs',
        docId: jobId,
        data: {
          status,
          ...(notes ? { statusNotes: notes } : {}),
        },
        timestamp: Date.now(),
        synced: false,
      });
    },
    []
  );

  const addJobPhoto = useCallback(
    async (
      jobId: string,
      dataUrl: string,
      fileName: string,
      caption?: string
    ) => {
      const isOnline =
        typeof window !== 'undefined' ? navigator.onLine : true;

      if (isOnline) {
        // Online: upload directly to Firebase Storage
        try {
          // Convert data URL to File for the existing upload function
          const response = await fetch(dataUrl);
          const blob = await response.blob();
          const file = new File([blob], fileName, { type: blob.type });
          await uploadJobPhoto(jobId, file, 'after');
          return;
        } catch (err) {
          console.warn(
            '[useOfflineJob] Online photo upload failed, queueing offline:',
            err
          );
          // Fall through to offline queue
        }
      }

      // Check size — limit to ~5MB for IndexedDB storage
      const sizeInBytes = Math.ceil((dataUrl.length * 3) / 4);
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (sizeInBytes > maxSize) {
        throw new Error(
          `Photo is too large for offline storage (${(sizeInBytes / 1024 / 1024).toFixed(1)}MB). Maximum is 5MB.`
        );
      }

      // Offline or online-but-failed: queue photo
      await queuePhoto({
        jobId,
        dataUrl,
        fileName,
        caption,
        timestamp: Date.now(),
        synced: false,
      });
    },
    []
  );

  return { updateJobStatus, addJobPhoto };
}

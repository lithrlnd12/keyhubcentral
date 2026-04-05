import { doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db } from '@/lib/firebase/config';
import { storage } from '@/lib/firebase/config';
import {
  getMutationQueue,
  removeMutation,
  getPhotoQueue,
  removePhoto,
  OfflineMutation,
  OfflinePhoto,
} from './offlineStore';

export interface SyncResult {
  synced: number;
  failed: number;
}

/**
 * Convert a base64 data URL to a Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const byteString = atob(parts[1]);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mime });
}

/**
 * Process a single mutation against Firestore
 */
async function processMutation(mutation: OfflineMutation): Promise<void> {
  const docRef = doc(db, mutation.collection, mutation.docId);

  switch (mutation.type) {
    case 'job_status_update': {
      await updateDoc(docRef, {
        ...mutation.data,
        updatedAt: serverTimestamp(),
      });
      break;
    }
    case 'job_note_add': {
      // Add note to the job's notes array
      const noteData = mutation.data;
      await updateDoc(docRef, {
        notes: arrayUnion({
          text: noteData.text,
          createdBy: noteData.createdBy,
          createdAt: noteData.createdAt || mutation.timestamp,
        }),
        updatedAt: serverTimestamp(),
      });
      break;
    }
    default:
      throw new Error(`Unknown mutation type: ${mutation.type}`);
  }
}

/**
 * Process all pending mutations in order.
 * Individual failures do not block other items.
 */
export async function processMutationQueue(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0 };

  let mutations: OfflineMutation[];
  try {
    mutations = await getMutationQueue();
  } catch (err) {
    console.error('[SyncManager] Failed to read mutation queue:', err);
    return result;
  }

  for (const mutation of mutations) {
    try {
      await processMutation(mutation);
      if (mutation.id !== undefined) {
        await removeMutation(mutation.id);
      }
      result.synced++;
    } catch (err) {
      console.error(
        `[SyncManager] Failed to sync mutation ${mutation.id} (${mutation.type}):`,
        err
      );
      result.failed++;
      // Leave in queue for retry
    }
  }

  return result;
}

/**
 * Process a single photo upload to Firebase Storage
 */
async function processPhoto(photo: OfflinePhoto): Promise<void> {
  const blob = dataUrlToBlob(photo.dataUrl);
  const timestamp = Date.now();
  const sanitizedFileName = photo.fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `jobs/${photo.jobId}/photos/offline/${timestamp}_${sanitizedFileName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, blob, {
    contentType: blob.type,
  });

  const downloadUrl = await getDownloadURL(storageRef);

  // Update the job document with the new photo
  const jobRef = doc(db, 'jobs', photo.jobId);
  await updateDoc(jobRef, {
    'photos.after': arrayUnion({
      url: downloadUrl,
      caption: photo.caption || '',
      uploadedAt: timestamp,
      offlineUpload: true,
    }),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Process all pending photo uploads.
 * Individual failures do not block other items.
 */
export async function processPhotoQueue(): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, failed: 0 };

  let photos: OfflinePhoto[];
  try {
    photos = await getPhotoQueue();
  } catch (err) {
    console.error('[SyncManager] Failed to read photo queue:', err);
    return result;
  }

  for (const photo of photos) {
    try {
      await processPhoto(photo);
      if (photo.id !== undefined) {
        await removePhoto(photo.id);
      }
      result.synced++;
    } catch (err) {
      console.error(
        `[SyncManager] Failed to sync photo ${photo.id} for job ${photo.jobId}:`,
        err
      );
      result.failed++;
      // Leave in queue for retry
    }
  }

  return result;
}

/**
 * Run both mutation and photo sync processors.
 * Returns combined results.
 */
export async function syncAll(): Promise<{
  mutations: SyncResult;
  photos: SyncResult;
  totalSynced: number;
  totalFailed: number;
}> {
  const [mutations, photos] = await Promise.all([
    processMutationQueue(),
    processPhotoQueue(),
  ]);

  return {
    mutations,
    photos,
    totalSynced: mutations.synced + photos.synced,
    totalFailed: mutations.failed + photos.failed,
  };
}

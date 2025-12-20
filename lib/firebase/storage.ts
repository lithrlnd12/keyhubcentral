import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import { storage } from './config';

export type DocumentType = 'w9' | 'insurance' | 'license' | 'photo';

export interface UploadProgress {
  progress: number;
  state: 'running' | 'paused' | 'success' | 'error';
  error?: Error;
  url?: string;
}

export function getContractorDocumentPath(
  userId: string,
  docType: DocumentType,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `contractors/${userId}/documents/${docType}_${timestamp}_${sanitizedFileName}`;
}

export function uploadContractorDocument(
  userId: string,
  file: File,
  docType: DocumentType,
  onProgress?: (progress: UploadProgress) => void
): UploadTask {
  const path = getContractorDocumentPath(userId, docType, file.name);
  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, file);

  uploadTask.on(
    'state_changed',
    (snapshot) => {
      const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
      onProgress?.({
        progress,
        state: snapshot.state as 'running' | 'paused',
      });
    },
    (error) => {
      onProgress?.({
        progress: 0,
        state: 'error',
        error,
      });
    },
    async () => {
      const url = await getDownloadURL(uploadTask.snapshot.ref);
      onProgress?.({
        progress: 100,
        state: 'success',
        url,
      });
    }
  );

  return uploadTask;
}

export async function getDocumentUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

export async function deleteDocument(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

export function extractPathFromUrl(url: string): string | null {
  try {
    const match = url.match(/\/o\/(.+?)\?/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch {
    return null;
  }
}

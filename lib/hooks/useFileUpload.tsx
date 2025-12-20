'use client';

import { useState, useCallback } from 'react';
import { UploadTask } from 'firebase/storage';
import {
  uploadContractorDocument,
  DocumentType,
  UploadProgress,
} from '@/lib/firebase/storage';

interface UseFileUploadOptions {
  userId: string;
  docType: DocumentType;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

interface UseFileUploadReturn {
  upload: (file: File) => void;
  cancel: () => void;
  progress: number;
  uploading: boolean;
  error: Error | null;
  url: string | null;
  reset: () => void;
}

export function useFileUpload({
  userId,
  docType,
  onSuccess,
  onError,
}: UseFileUploadOptions): UseFileUploadReturn {
  const [uploadTask, setUploadTask] = useState<UploadTask | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  const handleProgress = useCallback(
    (uploadProgress: UploadProgress) => {
      setProgress(uploadProgress.progress);

      if (uploadProgress.state === 'success' && uploadProgress.url) {
        setUploading(false);
        setUrl(uploadProgress.url);
        onSuccess?.(uploadProgress.url);
      }

      if (uploadProgress.state === 'error' && uploadProgress.error) {
        setUploading(false);
        setError(uploadProgress.error);
        onError?.(uploadProgress.error);
      }
    },
    [onSuccess, onError]
  );

  const upload = useCallback(
    (file: File) => {
      setUploading(true);
      setError(null);
      setProgress(0);
      setUrl(null);

      const task = uploadContractorDocument(userId, file, docType, handleProgress);
      setUploadTask(task);
    },
    [userId, docType, handleProgress]
  );

  const cancel = useCallback(() => {
    if (uploadTask) {
      uploadTask.cancel();
      setUploading(false);
      setProgress(0);
    }
  }, [uploadTask]);

  const reset = useCallback(() => {
    setProgress(0);
    setUploading(false);
    setError(null);
    setUrl(null);
    setUploadTask(null);
  }, []);

  return {
    upload,
    cancel,
    progress,
    uploading,
    error,
    url,
    reset,
  };
}

import {
  ref,
  uploadBytesResumable,
  uploadBytes,
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

// ==========================================
// JOB PHOTO FUNCTIONS
// ==========================================

export type JobPhotoType = 'before' | 'after';

export function getJobPhotoPath(
  jobId: string,
  photoType: JobPhotoType,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `jobs/${jobId}/photos/${photoType}/${timestamp}_${sanitizedFileName}`;
}

export async function uploadJobPhoto(
  jobId: string,
  file: File,
  photoType: JobPhotoType
): Promise<string> {
  const path = getJobPhotoPath(jobId, photoType, file.name);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export function uploadJobPhotoWithProgress(
  jobId: string,
  file: File,
  photoType: JobPhotoType,
  onProgress?: (progress: UploadProgress) => void
): UploadTask {
  const path = getJobPhotoPath(jobId, photoType, file.name);
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

export async function deleteJobPhoto(url: string): Promise<void> {
  const path = extractPathFromUrl(url);
  if (path) {
    await deleteDocument(path);
  }
}

// ==========================================
// JOB DOCUMENT FUNCTIONS
// ==========================================

export type JobDocumentType = 'contract' | 'down_payment' | 'final_payment';

export function getJobDocumentPath(
  jobId: string,
  docType: JobDocumentType,
  fileName: string
): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `jobs/${jobId}/documents/${docType}_${timestamp}_${sanitizedFileName}`;
}

export async function uploadJobDocument(
  jobId: string,
  file: File,
  docType: JobDocumentType
): Promise<string> {
  const path = getJobDocumentPath(jobId, docType, file.name);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export function uploadJobDocumentWithProgress(
  jobId: string,
  file: File,
  docType: JobDocumentType,
  onProgress?: (progress: UploadProgress) => void
): UploadTask {
  const path = getJobDocumentPath(jobId, docType, file.name);
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

// ==========================================
// JOB SIGNATURE FUNCTIONS (Completion Certificate)
// ==========================================

export type SignatureType = 'customer' | 'contractor';

export function getJobSignaturePath(
  jobId: string,
  signatureType: SignatureType
): string {
  const timestamp = Date.now();
  return `jobs/${jobId}/signatures/${signatureType}_${timestamp}.png`;
}

/**
 * Upload a signature from a canvas data URL
 * @param jobId The job ID
 * @param signatureType 'customer' or 'contractor'
 * @param dataUrl The PNG data URL from the signature canvas
 */
export async function uploadJobSignature(
  jobId: string,
  signatureType: SignatureType,
  dataUrl: string
): Promise<string> {
  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const path = getJobSignaturePath(jobId, signatureType);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/png' });
  return getDownloadURL(storageRef);
}

// ==========================================
// WORK ORDER PDF FUNCTIONS (Partner Service Tickets)
// ==========================================

export async function uploadPartnerTicketPhoto(
  userId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `partnerTickets/${userId}/photos/${timestamp}_${sanitizedFileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function uploadWorkOrderPdf(
  userId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `partnerTickets/${userId}/workorders/${timestamp}_${sanitizedFileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
  return getDownloadURL(storageRef);
}

export async function uploadLaborRequestPhoto(
  userId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `laborRequests/${userId}/photos/${timestamp}_${sanitizedFileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

export async function uploadLaborRequestPdf(
  userId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `laborRequests/${userId}/workorders/${timestamp}_${sanitizedFileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
  return getDownloadURL(storageRef);
}

export async function deleteJobDocument(url: string): Promise<void> {
  const path = extractPathFromUrl(url);
  if (path) {
    await deleteDocument(path);
  }
}

// ==========================================
// CONTRACT FUNCTIONS (Signed Contracts)
// ==========================================

export type ContractSignatureType = 'salesrep' | 'buyer1' | 'buyer2' | 'cancellation' | 'initials_lead' | 'initials_terms';

export function getContractSignaturePath(
  jobId: string,
  contractId: string,
  signatureType: ContractSignatureType
): string {
  const timestamp = Date.now();
  return `jobs/${jobId}/contracts/${contractId}/signatures/${signatureType}_${timestamp}.png`;
}

export function getContractPDFPath(
  jobId: string,
  contractId: string,
  documentType: string
): string {
  const timestamp = Date.now();
  const sanitizedType = documentType.replace(/_/g, '-');
  return `jobs/${jobId}/contracts/${contractId}/documents/${sanitizedType}_${timestamp}.pdf`;
}

/**
 * Upload a contract signature from a canvas data URL
 */
export async function uploadContractSignature(
  jobId: string,
  contractId: string,
  signatureType: ContractSignatureType,
  dataUrl: string
): Promise<string> {
  // Convert data URL to Blob
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  const path = getContractSignaturePath(jobId, contractId, signatureType);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: 'image/png' });
  return getDownloadURL(storageRef);
}

/**
 * Upload a generated contract PDF
 */
export async function uploadContractPDF(
  jobId: string,
  contractId: string,
  documentType: string,
  pdfBlob: Blob
): Promise<string> {
  const path = getContractPDFPath(jobId, contractId, documentType);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
  return getDownloadURL(storageRef);
}

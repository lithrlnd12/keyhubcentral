import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Job, CompletionCertificate } from '@/types/job';
import { uploadJobSignature, deleteJobDocument, extractPathFromUrl } from './storage';

/**
 * Save completion certificate signatures and update job
 */
export async function saveCompletionCertificate(
  jobId: string,
  customerSignatureDataUrl: string,
  contractorSignatureDataUrl: string,
  contractorId: string,
  customerName: string,
  notes?: string
): Promise<CompletionCertificate> {
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }

  // Upload signatures to Firebase Storage
  const customerSignatureUrl = await uploadJobSignature(jobId, 'customer', customerSignatureDataUrl);
  const contractorSignatureUrl = await uploadJobSignature(
    jobId,
    'contractor',
    contractorSignatureDataUrl
  );

  const completionCert: CompletionCertificate = {
    customerSignatureUrl,
    contractorSignatureUrl,
    signedAt: Timestamp.now(),
    signedBy: contractorId,
    customerName,
    notes,
  };

  // Update job with completion certificate in documents
  await updateDoc(jobRef, {
    'documents.completionCert': completionCert,
    updatedAt: serverTimestamp(),
  });

  return completionCert;
}

/**
 * Get completion certificate for a job
 */
export async function getCompletionCertificate(
  jobId: string
): Promise<CompletionCertificate | null> {
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    return null;
  }

  const job = { id: jobSnap.id, ...jobSnap.data() } as Job;
  return job.documents?.completionCert || null;
}

/**
 * Check if job has a valid completion certificate
 */
export async function hasCompletionCertificate(jobId: string): Promise<boolean> {
  const cert = await getCompletionCertificate(jobId);
  return cert !== null && !!cert.customerSignatureUrl && !!cert.contractorSignatureUrl;
}

/**
 * Delete completion certificate (if re-signing is needed)
 */
export async function deleteCompletionCertificate(jobId: string): Promise<void> {
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }

  const job = { id: jobSnap.id, ...jobSnap.data() } as Job;
  const cert = job.documents?.completionCert;

  if (cert) {
    // Delete signature files from storage
    try {
      const customerPath = extractPathFromUrl(cert.customerSignatureUrl);
      const contractorPath = extractPathFromUrl(cert.contractorSignatureUrl);

      if (customerPath) {
        await deleteJobDocument(cert.customerSignatureUrl);
      }
      if (contractorPath) {
        await deleteJobDocument(cert.contractorSignatureUrl);
      }
    } catch (error) {
      console.error('Failed to delete signature files:', error);
    }

    // Update job to remove completion certificate
    await updateDoc(jobRef, {
      'documents.completionCert': null,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Validate that all requirements are met for signing completion certificate
 */
export interface CompletionRequirements {
  hasBeforePhotos: boolean;
  hasAfterPhotos: boolean;
  hasMaterialsCollected: boolean;
  isValid: boolean;
  missingRequirements: string[];
}

export async function checkCompletionRequirements(
  jobId: string
): Promise<CompletionRequirements> {
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }

  const job = { id: jobSnap.id, ...jobSnap.data() } as Job;

  const missingRequirements: string[] = [];

  // Check before photos
  const hasBeforePhotos = (job.photos?.before?.length || 0) > 0;
  if (!hasBeforePhotos) {
    missingRequirements.push('Before photos are required');
  }

  // Check after photos
  const hasAfterPhotos = (job.photos?.after?.length || 0) > 0;
  if (!hasAfterPhotos) {
    missingRequirements.push('After photos are required');
  }

  // Check materials collected (if any materials exist)
  const materials = job.materials || [];
  const hasMaterialsCollected =
    materials.length === 0 ||
    materials.every((m) => m.status === 'arrived' || m.status === 'collected');
  if (!hasMaterialsCollected) {
    missingRequirements.push('All materials must be arrived or collected');
  }

  return {
    hasBeforePhotos,
    hasAfterPhotos,
    hasMaterialsCollected,
    isValid: missingRequirements.length === 0,
    missingRequirements,
  };
}

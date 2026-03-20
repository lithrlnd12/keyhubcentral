import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { ContractAddendum, AddendumType } from '@/types/contract';
import { uploadJobSignature } from './storage';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { storage } from './config';

/**
 * Upload an addendum photo to Firebase Storage
 */
export async function uploadAddendumPhoto(
  jobId: string,
  file: File
): Promise<string> {
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const path = `jobs/${jobId}/addendums/photos/${timestamp}_${sanitizedFileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: file.type });
  return getDownloadURL(storageRef);
}

/**
 * Upload an addendum PDF to Firebase Storage
 */
export async function uploadAddendumPDF(
  jobId: string,
  addendumId: string,
  pdfBlob: Blob
): Promise<string> {
  const timestamp = Date.now();
  const path = `jobs/${jobId}/addendums/${addendumId}/addendum_${timestamp}.pdf`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
  return getDownloadURL(storageRef);
}

/**
 * Get the next addendum number for a job
 */
async function getNextAddendumNumber(jobId: string): Promise<number> {
  const addendums = await getAddendums(jobId);
  return addendums.length + 1;
}

/**
 * Create and save a contract addendum
 */
export async function createAddendum(
  jobId: string,
  data: {
    type: AddendumType;
    description: string;
    costImpact: number;
    customerSignatureDataUrl: string;
    contractorSignatureDataUrl: string;
    customerName: string;
    contractorName: string;
    createdBy: string;
    photoFiles?: File[];
    pdfBlob?: Blob;
  }
): Promise<ContractAddendum> {
  const addendumNumber = await getNextAddendumNumber(jobId);

  // Upload photos
  const photoUrls: string[] = [];
  if (data.photoFiles && data.photoFiles.length > 0) {
    for (const file of data.photoFiles) {
      const url = await uploadAddendumPhoto(jobId, file);
      photoUrls.push(url);
    }
  }

  // Upload signatures
  const customerSignatureUrl = await uploadJobSignature(
    jobId,
    'customer',
    data.customerSignatureDataUrl
  );
  const contractorSignatureUrl = await uploadJobSignature(
    jobId,
    'contractor',
    data.contractorSignatureDataUrl
  );

  // Create the addendum document
  const addendumData = {
    jobId,
    addendumNumber,
    type: data.type,
    description: data.description,
    costImpact: data.costImpact,
    photoUrls,
    customerSignatureUrl,
    contractorSignatureUrl,
    customerName: data.customerName,
    contractorName: data.contractorName,
    signedAt: Timestamp.now(),
    createdBy: data.createdBy,
    status: 'signed' as const,
    createdAt: serverTimestamp(),
  };

  const colRef = collection(db, 'jobs', jobId, 'addendums');
  const docRef = await addDoc(colRef, addendumData);

  // Upload PDF if provided, then update the doc with the URL
  let pdfUrl: string | undefined;
  if (data.pdfBlob) {
    pdfUrl = await uploadAddendumPDF(jobId, docRef.id, data.pdfBlob);
    await updateDoc(doc(db, 'jobs', jobId, 'addendums', docRef.id), { pdfUrl });
  }

  // Update job costs if there's a cost impact
  if (data.costImpact !== 0) {
    const jobRef = doc(db, 'jobs', jobId);
    await updateDoc(jobRef, {
      updatedAt: serverTimestamp(),
    });
  }

  return {
    id: docRef.id,
    ...addendumData,
    pdfUrl,
  } as ContractAddendum;
}

/**
 * Get all addendums for a job, ordered by addendum number
 */
export async function getAddendums(jobId: string): Promise<ContractAddendum[]> {
  const colRef = collection(db, 'jobs', jobId, 'addendums');
  const q = query(colRef, orderBy('addendumNumber', 'asc'));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ContractAddendum[];
}

/**
 * Void an addendum
 */
export async function voidAddendum(jobId: string, addendumId: string): Promise<void> {
  const docRef = doc(db, 'jobs', jobId, 'addendums', addendumId);
  await updateDoc(docRef, {
    status: 'voided',
    updatedAt: serverTimestamp(),
  });
}

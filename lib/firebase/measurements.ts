import { doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import { getJob } from './jobs';
import {
  MeasurementSet,
  JobMeasurementsData,
  WallMeasurements,
  MeasurementSystemType,
  ColorFamily,
  WallStyle,
  MeasurementReference,
  EMPTY_WALL_MEASUREMENTS,
} from '@/types/measurements';

const COLLECTION = 'jobs';

/**
 * Generate a unique ID for a measurement set
 */
function generateMeasurementSetId(): string {
  return `ms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new measurement set with default values
 */
export function createEmptyMeasurementSet(
  systemType: MeasurementSystemType,
  userId: string,
  userName: string
): Omit<MeasurementSet, 'id'> {
  const now = Timestamp.now();
  return {
    systemType,
    colorFamily: 'standard',
    colorName: '',
    tileName: '',
    style: 'smooth',
    measurementReference: 'ceiling',
    measurements: { ...EMPTY_WALL_MEASUREMENTS },
    notes: '',
    measuredBy: userId,
    measuredByName: userName,
    measuredAt: now,
    updatedAt: now,
  };
}

/**
 * Add a measurement set to a job
 */
export async function addMeasurementSet(
  jobId: string,
  data: {
    systemType: MeasurementSystemType;
    colorFamily: ColorFamily;
    colorName: string;
    tileName: string;
    style: WallStyle;
    measurementReference: MeasurementReference;
    measurements: WallMeasurements;
    notes: string;
    measuredBy: string;
    measuredByName: string;
  }
): Promise<string> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');

  const now = Timestamp.now();
  const setId = generateMeasurementSetId();

  const newSet: MeasurementSet = {
    id: setId,
    ...data,
    measuredAt: now,
    updatedAt: now,
  };

  const currentMeasurements = job.measurements || { sets: [] };
  const updatedMeasurements: JobMeasurementsData = {
    ...currentMeasurements,
    sets: [...currentMeasurements.sets, newSet],
  };

  const docRef = doc(db, COLLECTION, jobId);
  await updateDoc(docRef, {
    measurements: updatedMeasurements,
    updatedAt: serverTimestamp(),
  });

  return setId;
}

/**
 * Update an existing measurement set
 */
export async function updateMeasurementSet(
  jobId: string,
  setId: string,
  data: Partial<Omit<MeasurementSet, 'id' | 'measuredAt'>>
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');

  const currentMeasurements = job.measurements || { sets: [] };
  const setIndex = currentMeasurements.sets.findIndex((s) => s.id === setId);

  if (setIndex === -1) {
    throw new Error('Measurement set not found');
  }

  const updatedSet: MeasurementSet = {
    ...currentMeasurements.sets[setIndex],
    ...data,
    updatedAt: Timestamp.now(),
  };

  const updatedSets = [...currentMeasurements.sets];
  updatedSets[setIndex] = updatedSet;

  const updatedMeasurements: JobMeasurementsData = {
    ...currentMeasurements,
    sets: updatedSets,
  };

  const docRef = doc(db, COLLECTION, jobId);
  await updateDoc(docRef, {
    measurements: updatedMeasurements,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a measurement set from a job
 */
export async function deleteMeasurementSet(
  jobId: string,
  setId: string
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');

  const currentMeasurements = job.measurements || { sets: [] };
  const updatedSets = currentMeasurements.sets.filter((s) => s.id !== setId);

  const updatedMeasurements: JobMeasurementsData = {
    ...currentMeasurements,
    sets: updatedSets,
  };

  const docRef = doc(db, COLLECTION, jobId);
  await updateDoc(docRef, {
    measurements: updatedMeasurements,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Get the storage path for a measurement form PDF
 */
function getMeasurementFormPath(jobId: string, fileName: string): string {
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `jobs/${jobId}/measurements/${timestamp}_${sanitizedFileName}`;
}

/**
 * Upload a filled measurement form PDF
 */
export async function uploadMeasurementForm(
  jobId: string,
  file: File
): Promise<{ url: string; name: string }> {
  // Validate file type
  if (file.type !== 'application/pdf') {
    throw new Error('Only PDF files are allowed');
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('File size must be less than 10MB');
  }

  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');

  // Upload file to storage
  const path = getMeasurementFormPath(jobId, file.name);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, { contentType: 'application/pdf' });
  const url = await getDownloadURL(storageRef);

  // Update job with the uploaded form reference
  const currentMeasurements = job.measurements || { sets: [] };
  const updatedMeasurements: JobMeasurementsData = {
    ...currentMeasurements,
    uploadedFormUrl: url,
    uploadedFormName: file.name,
    uploadedAt: Timestamp.now(),
  };

  const docRef = doc(db, COLLECTION, jobId);
  await updateDoc(docRef, {
    measurements: updatedMeasurements,
    updatedAt: serverTimestamp(),
  });

  return { url, name: file.name };
}

/**
 * Remove the uploaded measurement form
 */
export async function removeMeasurementForm(jobId: string): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');

  const currentMeasurements = job.measurements || { sets: [] };

  // Remove form URL but keep the sets
  const updatedMeasurements: JobMeasurementsData = {
    sets: currentMeasurements.sets,
  };

  const docRef = doc(db, COLLECTION, jobId);
  await updateDoc(docRef, {
    measurements: updatedMeasurements,
    updatedAt: serverTimestamp(),
  });
}

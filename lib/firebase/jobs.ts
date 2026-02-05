import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { Job, JobStatus, JobType, JobPhoto } from '@/types/job';

const COLLECTION = 'jobs';

// Stages that sales reps can see (up to and including front_end_hold)
export const SALES_REP_VISIBLE_STAGES: JobStatus[] = ['lead', 'sold', 'front_end_hold'];

export interface JobFilters {
  status?: JobStatus;
  type?: JobType;
  salesRepId?: string;
  pmId?: string;
  search?: string;
  // When true, filter to only show stages sales reps should see
  limitToSalesRepStages?: boolean;
}

export async function getJobs(filters?: JobFilters): Promise<Job[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.type) {
    constraints.unshift(where('type', '==', filters.type));
  }

  if (filters?.salesRepId) {
    constraints.unshift(where('salesRepId', '==', filters.salesRepId));
  }

  if (filters?.pmId) {
    constraints.unshift(where('pmId', '==', filters.pmId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let jobs = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Job[];

  // Client-side search filter (Firestore doesn't support text search)
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    jobs = jobs.filter(
      (job) =>
        job.jobNumber?.toLowerCase().includes(searchLower) ||
        job.customer.name?.toLowerCase().includes(searchLower) ||
        job.customer.address.city?.toLowerCase().includes(searchLower) ||
        job.customer.phone?.includes(searchLower)
    );
  }

  // Client-side filter for sales rep visible stages
  if (filters?.limitToSalesRepStages) {
    jobs = jobs.filter((job) => SALES_REP_VISIBLE_STAGES.includes(job.status));
  }

  return jobs;
}

export async function getJob(id: string): Promise<Job | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Job;
  }

  return null;
}

export async function getJobsByCrewMember(userId: string): Promise<Job[]> {
  const q = query(
    collection(db, COLLECTION),
    where('crewIds', 'array-contains', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Job[];
}

export async function createJob(
  data: Omit<Job, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateJob(
  id: string,
  data: Partial<Omit<Job, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteJob(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToJobs(
  callback: (jobs: Job[]) => void,
  filters?: JobFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.type) {
    constraints.unshift(where('type', '==', filters.type));
  }

  if (filters?.salesRepId) {
    constraints.unshift(where('salesRepId', '==', filters.salesRepId));
  }

  if (filters?.pmId) {
    constraints.unshift(where('pmId', '==', filters.pmId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Job[];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      jobs = jobs.filter(
        (job) =>
          job.jobNumber?.toLowerCase().includes(searchLower) ||
          job.customer.name?.toLowerCase().includes(searchLower) ||
          job.customer.address.city?.toLowerCase().includes(searchLower) ||
          job.customer.phone?.includes(searchLower)
      );
    }

    // Client-side filter for sales rep visible stages
    if (filters?.limitToSalesRepStages) {
      jobs = jobs.filter((job) => SALES_REP_VISIBLE_STAGES.includes(job.status));
    }

    callback(jobs);
  });
}

export function subscribeToJob(
  id: string,
  callback: (job: Job | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Job);
    } else {
      callback(null);
    }
  });
}

// Generate next job number
export async function generateJobNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  // Find the highest job number for this year
  let maxNumber = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.jobNumber?.startsWith(`KR-${year}-`)) {
      const num = parseInt(data.jobNumber.split('-')[2], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  return `KR-${year}-${String(maxNumber + 1).padStart(4, '0')}`;
}

// ==========================================
// CONTRACTOR-SPECIFIC JOB FUNCTIONS
// ==========================================

// Subscribe to jobs for a contractor (crew member) in real-time
export function subscribeToContractorJobs(
  contractorId: string,
  callback: (jobs: Job[]) => void,
  onError?: (error: Error) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('crewIds', 'array-contains', contractorId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Job[];
    callback(jobs);
  }, (error) => {
    console.error('subscribeToContractorJobs error:', error);
    onError?.(error);
  });
}

// Get completed jobs for a contractor (for invoice job selection)
export async function getContractorCompletedJobs(contractorId: string): Promise<Job[]> {
  // Get all jobs where contractor is in crew
  const jobs = await getJobsByCrewMember(contractorId);

  // Filter to only completed/paid_in_full jobs
  return jobs.filter((job) =>
    job.status === 'complete' || job.status === 'paid_in_full'
  );
}

// ==========================================
// JOB PHOTOS FUNCTIONS
// ==========================================

export async function addJobPhoto(
  jobId: string,
  photoType: 'before' | 'after',
  photo: JobPhoto
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');

  const currentPhotos = job.photos || { before: [], after: [] };
  const updatedPhotos = {
    ...currentPhotos,
    [photoType]: [...currentPhotos[photoType], photo],
  };

  await updateJob(jobId, { photos: updatedPhotos });
}

export async function removeJobPhoto(
  jobId: string,
  photoType: 'before' | 'after',
  photoUrl: string
): Promise<void> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found');

  const currentPhotos = job.photos || { before: [], after: [] };
  const updatedPhotos = {
    ...currentPhotos,
    [photoType]: currentPhotos[photoType].filter((p) => p.url !== photoUrl),
  };

  await updateJob(jobId, { photos: updatedPhotos });
}

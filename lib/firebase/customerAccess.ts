import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Job } from '@/types/job';
import { ServiceTicket } from '@/types/job';

const JOBS_COLLECTION = 'jobs';
const SERVICE_TICKETS_COLLECTION = 'serviceTickets';

/**
 * Get all jobs where the customer email matches.
 * Used for customers who may not have a userId yet.
 */
export async function getJobsByCustomerEmail(email: string): Promise<Job[]> {
  const q = query(
    collection(db, JOBS_COLLECTION),
    where('customer.email', '==', email.toLowerCase()),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Job[];
}

/**
 * Get all jobs where the customerId matches the logged-in user.
 */
export async function getJobsByCustomerId(userId: string): Promise<Job[]> {
  const q = query(
    collection(db, JOBS_COLLECTION),
    where('customerId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Job[];
}

/**
 * Get a specific job and verify the customer owns it.
 * Returns null if the job doesn't exist or the customer doesn't own it.
 */
export async function getJobForCustomer(
  jobId: string,
  customerEmail: string
): Promise<Job | null> {
  const docRef = doc(db, JOBS_COLLECTION, jobId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const job = { id: docSnap.id, ...docSnap.data() } as Job;

  // Verify the customer owns this job
  if (job.customer.email.toLowerCase() !== customerEmail.toLowerCase()) {
    return null;
  }

  return job;
}

/**
 * Subscribe to a specific job in real-time, with customer ownership verification.
 */
export function subscribeToCustomerJob(
  jobId: string,
  customerEmail: string,
  callback: (job: Job | null) => void
): () => void {
  const docRef = doc(db, JOBS_COLLECTION, jobId);

  return onSnapshot(docRef, (docSnap) => {
    if (!docSnap.exists()) {
      callback(null);
      return;
    }

    const job = { id: docSnap.id, ...docSnap.data() } as Job;

    // Verify customer ownership
    if (job.customer.email.toLowerCase() !== customerEmail.toLowerCase()) {
      callback(null);
      return;
    }

    callback(job);
  });
}

/**
 * Subscribe to all jobs for a customer in real-time.
 */
export function subscribeToCustomerJobs(
  customerEmail: string,
  callback: (jobs: Job[]) => void
): () => void {
  const q = query(
    collection(db, JOBS_COLLECTION),
    where('customer.email', '==', customerEmail.toLowerCase()),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Job[];
    callback(jobs);
  });
}

/**
 * Create a service request (ticket) from a customer, linked to a specific job.
 * Verifies customer ownership before creating.
 */
export async function createServiceRequestFromCustomer(
  jobId: string,
  customerEmail: string,
  data: {
    description: string;
    urgency: 'low' | 'medium' | 'high';
    contactPreference: 'phone' | 'email';
    photoUrls?: string[];
  }
): Promise<string> {
  // First verify the customer owns this job
  const job = await getJobForCustomer(jobId, customerEmail);
  if (!job) {
    throw new Error('Job not found or access denied');
  }

  // Generate a ticket number
  const ticketNumber = `ST-${Date.now().toString(36).toUpperCase()}`;

  const serviceTicket: Omit<ServiceTicket, 'id'> & {
    urgency: string;
    contactPreference: string;
    submittedByCustomer: boolean;
  } = {
    ticketNumber,
    jobId,
    customer: job.customer,
    issue: data.description,
    photosBefore: data.photoUrls || [],
    photosAfter: [],
    assignedTechId: null,
    status: 'new',
    resolution: null,
    urgency: data.urgency,
    contactPreference: data.contactPreference,
    submittedByCustomer: true,
    createdAt: serverTimestamp() as any,
    resolvedAt: null,
  };

  const docRef = await addDoc(
    collection(db, SERVICE_TICKETS_COLLECTION),
    serviceTicket
  );

  return docRef.id;
}

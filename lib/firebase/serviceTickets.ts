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
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { ServiceTicket, ServiceTicketStatus, Customer } from '@/types/job';

const COLLECTION = 'serviceTickets';

export interface ServiceTicketFilters {
  status?: ServiceTicketStatus;
  jobId?: string;
  assignedTechId?: string;
}

export async function getServiceTickets(
  filters?: ServiceTicketFilters
): Promise<ServiceTicket[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.jobId) {
    constraints.unshift(where('jobId', '==', filters.jobId));
  }

  if (filters?.assignedTechId) {
    constraints.unshift(where('assignedTechId', '==', filters.assignedTechId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ServiceTicket[];
}

export async function getServiceTicket(id: string): Promise<ServiceTicket | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as ServiceTicket;
  }

  return null;
}

export async function getServiceTicketsForJob(jobId: string): Promise<ServiceTicket[]> {
  const q = query(
    collection(db, COLLECTION),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ServiceTicket[];
}

export async function createServiceTicket(
  data: Omit<ServiceTicket, 'id' | 'createdAt' | 'resolvedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    resolvedAt: null,
  });

  return docRef.id;
}

export async function updateServiceTicket(
  id: string,
  data: Partial<Omit<ServiceTicket, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, data);
}

export async function resolveServiceTicket(
  id: string,
  resolution: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'complete',
    resolution,
    resolvedAt: serverTimestamp(),
  });
}

export async function deleteServiceTicket(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToServiceTickets(
  callback: (tickets: ServiceTicket[]) => void,
  filters?: ServiceTicketFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.jobId) {
    constraints.unshift(where('jobId', '==', filters.jobId));
  }

  if (filters?.assignedTechId) {
    constraints.unshift(where('assignedTechId', '==', filters.assignedTechId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const tickets = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ServiceTicket[];
    callback(tickets);
  });
}

// Generate next ticket number
export async function generateTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);

  let maxNumber = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.ticketNumber?.startsWith(`TKT-${year}-`)) {
      const num = parseInt(data.ticketNumber.split('-')[2], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  return `TKT-${year}-${String(maxNumber + 1).padStart(4, '0')}`;
}

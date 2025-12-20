import {
  collection,
  doc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import { JobCommunication, CommunicationType } from '@/types/job';

export async function getCommunications(
  jobId: string,
  maxResults: number = 50
): Promise<JobCommunication[]> {
  const q = query(
    collection(db, 'jobs', jobId, 'communications'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    jobId,
    ...doc.data(),
  })) as JobCommunication[];
}

export async function addCommunication(
  jobId: string,
  data: {
    type: CommunicationType;
    userId: string;
    content: string;
    attachments?: string[];
  }
): Promise<string> {
  const docRef = await addDoc(collection(db, 'jobs', jobId, 'communications'), {
    ...data,
    attachments: data.attachments || [],
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function deleteCommunication(
  jobId: string,
  communicationId: string
): Promise<void> {
  const docRef = doc(db, 'jobs', jobId, 'communications', communicationId);
  await deleteDoc(docRef);
}

export function subscribeToCommunications(
  jobId: string,
  callback: (communications: JobCommunication[]) => void,
  maxResults: number = 50
): () => void {
  const q = query(
    collection(db, 'jobs', jobId, 'communications'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );

  return onSnapshot(q, (snapshot) => {
    const communications = snapshot.docs.map((doc) => ({
      id: doc.id,
      jobId,
      ...doc.data(),
    })) as JobCommunication[];
    callback(communications);
  });
}

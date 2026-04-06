import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { QueuedEmail } from '@/types/emailTemplate';

const COLLECTION = 'emailQueue';

/**
 * Add an email to the queue for later sending.
 */
export async function queueEmail(
  data: Omit<QueuedEmail, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get pending emails where scheduledFor <= now.
 */
export async function getPendingEmails(limit = 50): Promise<QueuedEmail[]> {
  const now = Timestamp.now();
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'pending'),
    where('scheduledFor', '<=', now),
    orderBy('scheduledFor', 'asc'),
    firestoreLimit(limit)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as QueuedEmail[];
}

/**
 * Mark an email as sent and record the sentAt timestamp.
 */
export async function markEmailSent(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'sent',
    sentAt: serverTimestamp(),
  });
}

/**
 * Mark an email as failed and record the error message.
 */
export async function markEmailFailed(id: string, error: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'failed',
    error,
  });
}

/**
 * Get recent email history (sent and failed), ordered by creation time.
 */
export async function getEmailHistory(limit = 50): Promise<QueuedEmail[]> {
  const q = query(
    collection(db, COLLECTION),
    where('status', 'in', ['sent', 'failed', 'pending']),
    orderBy('createdAt', 'desc'),
    firestoreLimit(limit)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as QueuedEmail[];
}

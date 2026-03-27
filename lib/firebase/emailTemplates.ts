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
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { EmailTemplate, EmailTriggerEvent } from '@/types/emailTemplate';

const COLLECTION = 'emailTemplates';

/**
 * Get all email templates, ordered by creation date descending.
 */
export async function getEmailTemplates(): Promise<EmailTemplate[]> {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as EmailTemplate[];
}

/**
 * Get a single email template by ID.
 */
export async function getEmailTemplate(id: string): Promise<EmailTemplate | null> {
  const docRef = doc(db, COLLECTION, id);
  const snapshot = await getDoc(docRef);
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as EmailTemplate;
}

/**
 * Create a new email template. Returns the new document ID.
 */
export async function createEmailTemplate(
  data: Omit<EmailTemplate, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Update an existing email template.
 */
export async function updateEmailTemplate(
  id: string,
  data: Partial<Omit<EmailTemplate, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete an email template.
 */
export async function deleteEmailTemplate(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Find all enabled templates for a specific trigger event.
 */
export async function getTemplatesByTrigger(
  event: EmailTriggerEvent
): Promise<EmailTemplate[]> {
  const q = query(
    collection(db, COLLECTION),
    where('trigger', '==', event),
    where('enabled', '==', true)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as EmailTemplate[];
}

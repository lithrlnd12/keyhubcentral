import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { RemoteSigningSession, RemoteSigningStatus } from '@/types/remoteSignature';

const COLLECTION_NAME = 'remoteSigningSessions';

function getCollection() {
  return collection(db, COLLECTION_NAME);
}

/**
 * Create a new remote signing session with a unique token and 48h expiry
 */
export async function createSigningSession(data: {
  contractId: string;
  jobId: string;
  recipientEmail: string;
  recipientName: string;
  sentBy: string;
}): Promise<RemoteSigningSession> {
  const colRef = getCollection();
  const docRef = doc(colRef);
  const token = crypto.randomUUID();
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(new Date(Date.now() + 48 * 60 * 60 * 1000));

  const session: RemoteSigningSession = {
    id: docRef.id,
    contractId: data.contractId,
    jobId: data.jobId,
    token,
    recipientEmail: data.recipientEmail,
    recipientName: data.recipientName,
    sentBy: data.sentBy,
    status: 'pending',
    expiresAt,
    viewedAt: null,
    signedAt: null,
    signatureUrl: null,
    ipAddress: null,
    userAgent: null,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(docRef, session);
  return session;
}

/**
 * Look up a signing session by its unique token
 */
export async function getSigningSessionByToken(
  token: string
): Promise<RemoteSigningSession | null> {
  const q = query(getCollection(), where('token', '==', token));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  return snapshot.docs[0].data() as RemoteSigningSession;
}

/**
 * Mark a session as viewed (first access by recipient)
 */
export async function markSessionViewed(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    status: 'viewed' as RemoteSigningStatus,
    viewedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

/**
 * Complete a signing session with the captured signature and metadata
 */
export async function completeSigningSession(
  id: string,
  signatureUrl: string,
  ipAddress: string | null,
  userAgent: string | null
): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    status: 'signed' as RemoteSigningStatus,
    signedAt: Timestamp.now(),
    signatureUrl,
    ipAddress,
    userAgent,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Cancel a signing session
 */
export async function cancelSigningSession(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    status: 'cancelled' as RemoteSigningStatus,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Get all signing sessions for a given contract
 */
export async function getSigningSessionsForContract(
  contractId: string
): Promise<RemoteSigningSession[]> {
  const q = query(getCollection(), where('contractId', '==', contractId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as RemoteSigningSession);
}

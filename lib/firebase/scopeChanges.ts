import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export interface ScopeChange {
  id: string;
  description: string;
  estimatedImpact: string | null;
  reportedBy: string;
  reportedByName?: string;
  reportedVia: 'voice' | 'app';
  status: 'pending' | 'approved' | 'rejected';
  callId?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

/**
 * Create a new scope change record for a job.
 */
export async function createScopeChange(
  jobId: string,
  data: {
    description: string;
    estimatedImpact?: string;
    reportedBy: string;
    reportedByName?: string;
    reportedVia: 'voice' | 'app';
    callId?: string;
  }
): Promise<ScopeChange> {
  const db = getAdminDb();

  const docRef = await db
    .collection('jobs')
    .doc(jobId)
    .collection('scopeChanges')
    .add({
      description: data.description,
      estimatedImpact: data.estimatedImpact || null,
      reportedBy: data.reportedBy,
      reportedByName: data.reportedByName || null,
      reportedVia: data.reportedVia,
      status: 'pending',
      callId: data.callId || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  const snap = await docRef.get();
  return { id: docRef.id, ...snap.data() } as ScopeChange;
}

/**
 * Get all scope changes for a job, ordered by creation date descending.
 */
export async function getScopeChanges(jobId: string): Promise<ScopeChange[]> {
  const db = getAdminDb();

  const snap = await db
    .collection('jobs')
    .doc(jobId)
    .collection('scopeChanges')
    .orderBy('createdAt', 'desc')
    .get();

  return snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as ScopeChange[];
}

/**
 * Update the status of a scope change (approve or reject).
 */
export async function updateScopeChangeStatus(
  jobId: string,
  scopeChangeId: string,
  status: 'approved' | 'rejected',
  reviewedBy?: string
): Promise<void> {
  const db = getAdminDb();

  await db
    .collection('jobs')
    .doc(jobId)
    .collection('scopeChanges')
    .doc(scopeChangeId)
    .update({
      status,
      reviewedBy: reviewedBy || null,
      updatedAt: FieldValue.serverTimestamp(),
    });
}

import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Contractor } from '@/types/contractor';

/**
 * Auto-enroll all active contractors into the given networks.
 * Called when admin enables KeyHub Network or accepts a network invite.
 * Skips contractors who have explicitly opted out.
 */
export async function autoEnrollContractorsInNetwork(
  networkIds: string[]
): Promise<number> {
  if (networkIds.length === 0) return 0;

  const q = query(
    collection(db, 'contractors'),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  let enrolled = 0;

  for (const contractorDoc of snapshot.docs) {
    const contractor = { id: contractorDoc.id, ...contractorDoc.data() } as Contractor;

    // Skip if explicitly opted out
    if (contractor.networkOptOut) continue;

    // Skip if already enrolled in all these networks
    const existing = new Set(contractor.sharedNetworks || []);
    const newIds = networkIds.filter((id) => !existing.has(id));
    if (newIds.length === 0) continue;

    try {
      const ref = doc(db, 'contractors', contractorDoc.id);
      await updateDoc(ref, {
        sharedNetworks: [...Array.from(existing), ...newIds],
        networkOptInDismissedAt: null,
        updatedAt: serverTimestamp(),
      });
      enrolled++;
    } catch (err) {
      console.error(`Failed to enroll contractor ${contractorDoc.id}:`, err);
    }
  }

  return enrolled;
}


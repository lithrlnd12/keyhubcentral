import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { createNotification } from './notifications';
import { Contractor } from '@/types/contractor';

/**
 * Send network opt-in notifications to all active contractors.
 * Called when admin enables KeyHub Network.
 * Skips contractors who already opted in, opted out, or dismissed within 7 days.
 */
export async function sendNetworkOptInNotifications(): Promise<number> {
  const q = query(
    collection(db, 'contractors'),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  let sent = 0;

  const sevenDaysAgo = Timestamp.fromDate(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  );

  for (const contractorDoc of snapshot.docs) {
    const contractor = { id: contractorDoc.id, ...contractorDoc.data() } as Contractor;

    // Skip if already opted in to any network
    if (contractor.sharedNetworks && contractor.sharedNetworks.length > 0) continue;

    // Skip if explicitly opted out
    if (contractor.networkOptOut) continue;

    // Skip if dismissed within 7 days
    if (contractor.networkOptInDismissedAt) {
      const dismissedAt = contractor.networkOptInDismissedAt;
      if (dismissedAt.toMillis() > sevenDaysAgo.toMillis()) continue;
    }

    // Send notification to the contractor's user
    if (contractor.userId) {
      try {
        await createNotification(contractor.userId, 'network_opt_in', {});
        sent++;
      } catch (err) {
        console.error(`Failed to notify contractor ${contractor.id}:`, err);
      }
    }
  }

  return sent;
}

/**
 * Contractor accepts network opt-in — add all active networkIds to sharedNetworks.
 */
export async function acceptNetworkOptIn(
  contractorId: string,
  networkIds: string[]
): Promise<void> {
  const ref = doc(db, 'contractors', contractorId);
  await updateDoc(ref, {
    sharedNetworks: networkIds,
    networkOptOut: false,
    networkOptInDismissedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Contractor declines network opt-in — set opt-out flag.
 */
export async function declineNetworkOptIn(contractorId: string): Promise<void> {
  const ref = doc(db, 'contractors', contractorId);
  await updateDoc(ref, {
    networkOptOut: true,
    networkOptInDismissedAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Contractor defers decision — record dismissal timestamp.
 * Notification will re-surface after 7 days.
 */
export async function deferNetworkOptIn(contractorId: string): Promise<void> {
  const ref = doc(db, 'contractors', contractorId);
  await updateDoc(ref, {
    networkOptInDismissedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Admin resets a contractor's opt-out so they can be asked again.
 */
export async function resetNetworkOptOut(contractorId: string): Promise<void> {
  const ref = doc(db, 'contractors', contractorId);
  await updateDoc(ref, {
    networkOptOut: false,
    networkOptInDismissedAt: null,
    updatedAt: serverTimestamp(),
  });
}

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  collectionGroup,
} from 'firebase/firestore';
import { db } from './config';
import {
  GoogleCalendarIntegration,
  GoogleCalendarIntegrationInput,
} from '@/types/calendarIntegration';

// Get integration document reference
function getIntegrationDocRef(userId: string) {
  return doc(db, 'users', userId, 'integrations', 'googleCalendar');
}

// Get calendar integration for a user
export async function getCalendarIntegration(
  userId: string
): Promise<GoogleCalendarIntegration | null> {
  const docRef = getIntegrationDocRef(userId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as GoogleCalendarIntegration;
  }

  return null;
}

// Save calendar integration (create or update)
export async function saveCalendarIntegration(
  userId: string,
  data: GoogleCalendarIntegrationInput
): Promise<void> {
  const docRef = getIntegrationDocRef(userId);

  await setDoc(docRef, {
    ...data,
    expiresAt:
      data.expiresAt instanceof Date
        ? Timestamp.fromDate(data.expiresAt)
        : data.expiresAt,
    lastSyncAt: null,
    lastSyncStatus: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

// Update calendar integration (partial update)
export async function updateCalendarIntegration(
  userId: string,
  data: Partial<GoogleCalendarIntegration>
): Promise<void> {
  const docRef = getIntegrationDocRef(userId);

  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Delete calendar integration
export async function deleteCalendarIntegration(userId: string): Promise<void> {
  const docRef = getIntegrationDocRef(userId);
  await deleteDoc(docRef);
}

// Check if user has calendar integration enabled
export async function hasCalendarIntegration(userId: string): Promise<boolean> {
  const integration = await getCalendarIntegration(userId);
  return integration !== null && integration.enabled;
}

// Update sync status
export async function updateSyncStatus(
  userId: string,
  status: 'success' | 'error' | 'pending' | 'syncing',
  error?: string
): Promise<void> {
  const docRef = getIntegrationDocRef(userId);

  const update: Record<string, unknown> = {
    lastSyncStatus: status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'success') {
    update.lastSyncAt = serverTimestamp();
    update.lastSyncError = null;
  } else if (status === 'error' && error) {
    update.lastSyncError = error;
  }

  await updateDoc(docRef, update);
}

// Update tokens (for token refresh)
export async function updateCalendarTokens(
  userId: string,
  accessToken: string,
  expiresAt: Date
): Promise<void> {
  const docRef = getIntegrationDocRef(userId);

  await updateDoc(docRef, {
    accessToken,
    expiresAt: Timestamp.fromDate(expiresAt),
    updatedAt: serverTimestamp(),
  });
}

// Get all users with enabled calendar sync (for scheduled sync job)
// Note: This uses collectionGroup query which requires a composite index
export async function getUsersWithEnabledSync(): Promise<
  Array<{ userId: string; integration: GoogleCalendarIntegration }>
> {
  const integrationsQuery = query(
    collectionGroup(db, 'integrations'),
    where('enabled', '==', true)
  );

  const snapshot = await getDocs(integrationsQuery);
  const results: Array<{ userId: string; integration: GoogleCalendarIntegration }> = [];

  snapshot.docs.forEach((docSnap) => {
    // The parent of the integration doc is the 'integrations' collection
    // The parent of that is the user document
    const userId = docSnap.ref.parent.parent?.id;
    if (userId && docSnap.id === 'googleCalendar') {
      results.push({
        userId,
        integration: docSnap.data() as GoogleCalendarIntegration,
      });
    }
  });

  return results;
}

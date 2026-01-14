import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import {
  RatingRequest,
  RatingRequestStatus,
  CreateRatingRequestInput,
  RATING_REQUEST_EXPIRY_DAYS,
  generateRatingToken,
} from '@/types/ratingRequest';

const COLLECTION_NAME = 'ratingRequests';

// Get the rating requests collection
function getRatingRequestsCollection() {
  return collection(db, COLLECTION_NAME);
}

// Create a new rating request
export async function createRatingRequest(
  input: CreateRatingRequestInput
): Promise<RatingRequest> {
  const token = generateRatingToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + RATING_REQUEST_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const docRef = doc(getRatingRequestsCollection());

  const ratingRequest: Omit<RatingRequest, 'id'> = {
    jobId: input.jobId,
    jobNumber: input.jobNumber,
    contractorId: input.contractorId,
    contractorName: input.contractorName,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    token,
    status: 'pending',
    sentAt: Timestamp.now(),
    expiresAt: Timestamp.fromDate(expiresAt),
    createdAt: Timestamp.now(),
  };

  await setDoc(docRef, ratingRequest);

  return {
    id: docRef.id,
    ...ratingRequest,
  };
}

// Get rating request by ID
export async function getRatingRequest(
  requestId: string
): Promise<RatingRequest | null> {
  const docRef = doc(getRatingRequestsCollection(), requestId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return { id: docSnap.id, ...docSnap.data() } as RatingRequest;
}

// Get rating request by token (for public rating page)
export async function getRatingRequestByToken(
  token: string
): Promise<RatingRequest | null> {
  const q = query(
    getRatingRequestsCollection(),
    where('token', '==', token)
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as RatingRequest;
}

// Submit a rating
export async function submitRating(
  token: string,
  rating: number,
  comment?: string
): Promise<void> {
  // Find the request by token
  const request = await getRatingRequestByToken(token);

  if (!request) {
    throw new Error('Rating request not found');
  }

  if (request.status === 'completed') {
    throw new Error('This rating has already been submitted');
  }

  if (request.status === 'expired' || request.expiresAt.toDate() < new Date()) {
    throw new Error('This rating request has expired');
  }

  // Validate rating
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // Update the rating request
  const docRef = doc(getRatingRequestsCollection(), request.id);
  await updateDoc(docRef, {
    rating,
    comment: comment || null,
    status: 'completed' as RatingRequestStatus,
    completedAt: serverTimestamp(),
  });
}

// Get pending rating requests for a job
export async function getPendingRatingRequestsForJob(
  jobId: string
): Promise<RatingRequest[]> {
  const q = query(
    getRatingRequestsCollection(),
    where('jobId', '==', jobId),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as RatingRequest[];
}

// Get completed ratings for a contractor
export async function getContractorRatings(
  contractorId: string
): Promise<RatingRequest[]> {
  const q = query(
    getRatingRequestsCollection(),
    where('contractorId', '==', contractorId),
    where('status', '==', 'completed')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as RatingRequest[];
}

// Calculate average customer rating for a contractor
export async function calculateContractorCustomerRating(
  contractorId: string
): Promise<number> {
  const ratings = await getContractorRatings(contractorId);

  if (ratings.length === 0) {
    return 3; // Default rating if no reviews
  }

  const sum = ratings.reduce((acc, r) => acc + (r.rating || 0), 0);
  return Math.round((sum / ratings.length) * 10) / 10; // Round to 1 decimal
}

// Mark reminder sent
export async function markReminderSent(requestId: string): Promise<void> {
  const docRef = doc(getRatingRequestsCollection(), requestId);
  await updateDoc(docRef, {
    reminderSentAt: serverTimestamp(),
  });
}

// Get rating requests that need reminders (pending, not yet reminded, job paid)
export async function getRatingRequestsNeedingReminder(): Promise<RatingRequest[]> {
  // This query would be done server-side in Cloud Functions
  // Since Firestore doesn't support NOT EXISTS queries easily,
  // we'll fetch pending requests and filter in code
  const q = query(
    getRatingRequestsCollection(),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  const requests = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as RatingRequest[];

  // Filter to those without reminder sent
  return requests.filter((r) => !r.reminderSentAt);
}

// Expire old rating requests
export async function expireOldRatingRequests(): Promise<number> {
  const now = new Date();
  const q = query(
    getRatingRequestsCollection(),
    where('status', '==', 'pending')
  );

  const snapshot = await getDocs(q);
  let expiredCount = 0;

  for (const docSnap of snapshot.docs) {
    const request = docSnap.data() as RatingRequest;
    if (request.expiresAt.toDate() < now) {
      await updateDoc(doc(getRatingRequestsCollection(), docSnap.id), {
        status: 'expired' as RatingRequestStatus,
      });
      expiredCount++;
    }
  }

  return expiredCount;
}

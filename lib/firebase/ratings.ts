import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';
import { Rating } from '@/types/contractor';
import { updateRating, createRating } from '@/lib/utils/ratings';

const COLLECTION = 'contractors';

// Update contractor rating
export async function updateContractorRating(
  contractorId: string,
  updates: Partial<Omit<Rating, 'overall'>>
): Promise<Rating> {
  const docRef = doc(db, COLLECTION, contractorId);

  // We'll need the current rating to merge with updates
  // For simplicity, we create the new rating here - caller should provide full updates
  const newRating = createRating(updates);

  await updateDoc(docRef, {
    rating: newRating,
    updatedAt: serverTimestamp(),
  });

  return newRating;
}

// Update contractor rating with merge
export async function mergeContractorRating(
  contractorId: string,
  currentRating: Rating,
  updates: Partial<Omit<Rating, 'overall'>>
): Promise<Rating> {
  const docRef = doc(db, COLLECTION, contractorId);
  const newRating = updateRating(currentRating, updates);

  await updateDoc(docRef, {
    rating: newRating,
    updatedAt: serverTimestamp(),
  });

  return newRating;
}

// Set full rating (replaces all values)
export async function setContractorRating(
  contractorId: string,
  rating: Rating
): Promise<void> {
  const docRef = doc(db, COLLECTION, contractorId);

  await updateDoc(docRef, {
    rating,
    updatedAt: serverTimestamp(),
  });
}

// Reset rating to defaults
export async function resetContractorRating(
  contractorId: string
): Promise<Rating> {
  const defaultRating = createRating({});
  const docRef = doc(db, COLLECTION, contractorId);

  await updateDoc(docRef, {
    rating: defaultRating,
    updatedAt: serverTimestamp(),
  });

  return defaultRating;
}

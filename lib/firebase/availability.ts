import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Availability, AvailabilityStatus, formatDateKey } from '@/types/availability';

// Get availability subcollection path
function getAvailabilityCollection(contractorId: string) {
  return collection(db, 'contractors', contractorId, 'availability');
}

// Get availability for a specific date
export async function getAvailability(
  contractorId: string,
  date: Date
): Promise<Availability | null> {
  const dateKey = formatDateKey(date);
  const docRef = doc(getAvailabilityCollection(contractorId), dateKey);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Availability;
  }

  return null;
}

// Get availability for a date range
export async function getAvailabilityRange(
  contractorId: string,
  startDate: Date,
  endDate: Date
): Promise<Availability[]> {
  const startKey = formatDateKey(startDate);
  const endKey = formatDateKey(endDate);

  const q = query(
    getAvailabilityCollection(contractorId),
    where('date', '>=', startKey),
    where('date', '<=', endKey),
    orderBy('date', 'asc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Availability[];
}

// Set availability for a date
export async function setAvailability(
  contractorId: string,
  date: Date,
  status: AvailabilityStatus,
  notes?: string
): Promise<void> {
  const dateKey = formatDateKey(date);
  const docRef = doc(getAvailabilityCollection(contractorId), dateKey);

  await setDoc(docRef, {
    date: dateKey,
    status,
    notes: notes || null,
    updatedAt: serverTimestamp(),
  });
}

// Clear availability for a date (resets to default)
export async function clearAvailability(
  contractorId: string,
  date: Date
): Promise<void> {
  const dateKey = formatDateKey(date);
  const docRef = doc(getAvailabilityCollection(contractorId), dateKey);
  await deleteDoc(docRef);
}

// Set availability for multiple dates
export async function setAvailabilityBulk(
  contractorId: string,
  dates: Date[],
  status: AvailabilityStatus,
  notes?: string
): Promise<void> {
  const promises = dates.map((date) =>
    setAvailability(contractorId, date, status, notes)
  );
  await Promise.all(promises);
}

// Subscribe to availability for a month
export function subscribeToMonthAvailability(
  contractorId: string,
  year: number,
  month: number, // 0-indexed
  callback: (availability: Map<string, Availability>) => void
): () => void {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  const startKey = formatDateKey(startDate);
  const endKey = formatDateKey(endDate);

  const q = query(
    getAvailabilityCollection(contractorId),
    where('date', '>=', startKey),
    where('date', '<=', endKey),
    orderBy('date', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const availabilityMap = new Map<string, Availability>();
    snapshot.docs.forEach((doc) => {
      const data = { id: doc.id, ...doc.data() } as Availability;
      availabilityMap.set(data.date, data);
    });
    callback(availabilityMap);
  });
}

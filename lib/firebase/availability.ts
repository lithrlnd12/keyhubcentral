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
  updateDoc,
} from 'firebase/firestore';
import { db } from './config';
import {
  Availability,
  AvailabilityStatus,
  BlockStatus,
  TimeBlock,
  formatDateKey,
  getDefaultBlocks,
  legacyStatusToBlocks,
} from '@/types/availability';

// Get availability subcollection path
function getAvailabilityCollection(contractorId: string) {
  return collection(db, 'contractors', contractorId, 'availability');
}

// Normalize availability data (handle legacy format migration)
function normalizeAvailability(data: any, id: string): Availability {
  // If blocks exist, data is already in new format
  if (data.blocks) {
    return { id, ...data } as Availability;
  }

  // Migrate legacy single-status format to blocks
  const blocks = data.status
    ? legacyStatusToBlocks(data.status)
    : getDefaultBlocks();

  return {
    id,
    date: data.date,
    blocks,
    notes: data.notes,
    updatedAt: data.updatedAt,
    googleEventIds: data.googleEventId ? { am: data.googleEventId } : undefined,
    syncSource: data.syncSource,
    // Keep legacy fields for reference
    status: data.status,
    googleEventId: data.googleEventId,
  };
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
    return normalizeAvailability(docSnap.data(), docSnap.id);
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
  return snapshot.docs.map((doc) => normalizeAvailability(doc.data(), doc.id));
}

// Set availability for all blocks on a date
export async function setAvailability(
  contractorId: string,
  date: Date,
  blocks: BlockStatus,
  notes?: string
): Promise<void> {
  const dateKey = formatDateKey(date);
  const docRef = doc(getAvailabilityCollection(contractorId), dateKey);

  await setDoc(docRef, {
    date: dateKey,
    blocks,
    notes: notes || null,
    updatedAt: serverTimestamp(),
    syncSource: 'app',
  });
}

// Set availability for a single block on a date
export async function setBlockAvailability(
  contractorId: string,
  date: Date,
  block: TimeBlock,
  status: AvailabilityStatus
): Promise<void> {
  const dateKey = formatDateKey(date);
  const docRef = doc(getAvailabilityCollection(contractorId), dateKey);

  // Get existing availability or create default
  const existing = await getAvailability(contractorId, date);
  const blocks = existing?.blocks || getDefaultBlocks();

  // Update the specific block
  blocks[block] = status;

  await setDoc(docRef, {
    date: dateKey,
    blocks,
    notes: existing?.notes || null,
    updatedAt: serverTimestamp(),
    syncSource: 'app',
    // Preserve existing Google event IDs
    googleEventIds: existing?.googleEventIds || {},
  });
}

// Set all blocks to the same status (convenience function)
export async function setAllBlocksStatus(
  contractorId: string,
  date: Date,
  status: AvailabilityStatus,
  notes?: string
): Promise<void> {
  const blocks: BlockStatus = {
    am: status,
    pm: status,
    evening: status,
  };
  await setAvailability(contractorId, date, blocks, notes);
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

// Set availability for multiple dates (all blocks same status)
export async function setAvailabilityBulk(
  contractorId: string,
  dates: Date[],
  status: AvailabilityStatus,
  notes?: string
): Promise<void> {
  const promises = dates.map((date) =>
    setAllBlocksStatus(contractorId, date, status, notes)
  );
  await Promise.all(promises);
}

// Set availability for multiple dates with block-level control
export async function setAvailabilityBulkBlocks(
  contractorId: string,
  dates: Date[],
  blocks: BlockStatus,
  notes?: string
): Promise<void> {
  const promises = dates.map((date) =>
    setAvailability(contractorId, date, blocks, notes)
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
    snapshot.docs.forEach((docSnap) => {
      const data = normalizeAvailability(docSnap.data(), docSnap.id);
      availabilityMap.set(data.date, data);
    });
    callback(availabilityMap);
  });
}

// Get availability for all contractors for a date range
export async function getAllContractorsAvailability(
  contractorIds: string[],
  startDate: Date,
  endDate: Date
): Promise<Map<string, Map<string, Availability>>> {
  const result = new Map<string, Map<string, Availability>>();

  const promises = contractorIds.map(async (contractorId) => {
    const availability = await getAvailabilityRange(contractorId, startDate, endDate);
    const availabilityMap = new Map<string, Availability>();
    availability.forEach((a) => availabilityMap.set(a.date, a));
    result.set(contractorId, availabilityMap);
  });

  await Promise.all(promises);
  return result;
}

// Get availability status for a contractor on a specific date and block
export async function getContractorBlockStatus(
  contractorId: string,
  date: Date,
  block: TimeBlock
): Promise<AvailabilityStatus> {
  const availability = await getAvailability(contractorId, date);

  // If no availability record, assume available
  if (!availability) {
    return 'available';
  }

  return availability.blocks[block];
}

// Get contractors available for a specific date and time block
// Returns map of contractorId -> availability status for that block
export async function getContractorsBlockAvailability(
  contractorIds: string[],
  date: Date,
  block: TimeBlock
): Promise<Map<string, AvailabilityStatus>> {
  const result = new Map<string, AvailabilityStatus>();

  const promises = contractorIds.map(async (contractorId) => {
    const status = await getContractorBlockStatus(contractorId, date, block);
    result.set(contractorId, status);
  });

  await Promise.all(promises);
  return result;
}

// Check if a contractor is available for a specific block
export async function isContractorAvailableForBlock(
  contractorId: string,
  date: Date,
  block: TimeBlock
): Promise<boolean> {
  const status = await getContractorBlockStatus(contractorId, date, block);
  return status === 'available';
}

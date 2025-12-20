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
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { Contractor, ContractorStatus, Trade } from '@/types/contractor';

const COLLECTION = 'contractors';

export interface ContractorFilters {
  status?: ContractorStatus;
  trade?: Trade;
  search?: string;
}

export async function getContractors(filters?: ContractorFilters): Promise<Contractor[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.trade) {
    constraints.unshift(where('trades', 'array-contains', filters.trade));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let contractors = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Contractor[];

  // Client-side search filter (Firestore doesn't support text search)
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    contractors = contractors.filter(
      (c) =>
        c.businessName?.toLowerCase().includes(searchLower) ||
        c.address.city.toLowerCase().includes(searchLower) ||
        c.address.state.toLowerCase().includes(searchLower)
    );
  }

  return contractors;
}

export async function getContractor(id: string): Promise<Contractor | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Contractor;
  }

  return null;
}

export async function getContractorByUserId(userId: string): Promise<Contractor | null> {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Contractor;
}

export async function createContractor(
  data: Omit<Contractor, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateContractor(
  id: string,
  data: Partial<Omit<Contractor, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteContractor(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToContractors(
  callback: (contractors: Contractor[]) => void,
  filters?: ContractorFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.trade) {
    constraints.unshift(where('trades', 'array-contains', filters.trade));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let contractors = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Contractor[];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      contractors = contractors.filter(
        (c) =>
          c.businessName?.toLowerCase().includes(searchLower) ||
          c.address.city.toLowerCase().includes(searchLower) ||
          c.address.state.toLowerCase().includes(searchLower)
      );
    }

    callback(contractors);
  });
}

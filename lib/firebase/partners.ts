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
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { Partner, PartnerStatus, PartnerFilters } from '@/types/partner';

const COLLECTION = 'partners';

export async function getPartners(filters?: PartnerFilters): Promise<Partner[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let partners = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Partner[];

  // Client-side search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    partners = partners.filter(
      (partner) =>
        partner.companyName?.toLowerCase().includes(searchLower) ||
        partner.contactName?.toLowerCase().includes(searchLower) ||
        partner.contactEmail?.toLowerCase().includes(searchLower) ||
        partner.address.city?.toLowerCase().includes(searchLower)
    );
  }

  return partners;
}

export async function getPartner(id: string): Promise<Partner | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Partner;
  }

  return null;
}

export async function createPartner(
  data: Omit<Partner, 'id' | 'createdAt' | 'updatedAt' | 'approvedAt' | 'approvedBy'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    status: 'pending',
    approvedAt: null,
    approvedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updatePartner(
  id: string,
  data: Partial<Omit<Partner, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function approvePartner(
  id: string,
  approvedBy: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'active',
    approvedAt: serverTimestamp(),
    approvedBy,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePartnerStatus(
  id: string,
  status: PartnerStatus
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deletePartner(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToPartners(
  callback: (partners: Partner[]) => void,
  filters?: PartnerFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let partners = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Partner[];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      partners = partners.filter(
        (partner) =>
          partner.companyName?.toLowerCase().includes(searchLower) ||
          partner.contactName?.toLowerCase().includes(searchLower) ||
          partner.contactEmail?.toLowerCase().includes(searchLower) ||
          partner.address.city?.toLowerCase().includes(searchLower)
      );
    }

    callback(partners);
  });
}

export function subscribeToPartner(
  id: string,
  callback: (partner: Partner | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Partner);
    } else {
      callback(null);
    }
  });
}

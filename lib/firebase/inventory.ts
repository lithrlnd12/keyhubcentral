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
import {
  InventoryItem,
  InventoryCategory,
  InventoryFilters,
} from '@/types/inventory';

const COLLECTION = 'inventoryItems';

export async function getInventoryItems(filters?: InventoryFilters): Promise<InventoryItem[]> {
  const constraints: QueryConstraint[] = [orderBy('name', 'asc')];

  if (filters?.category) {
    constraints.unshift(where('category', '==', filters.category));
  }

  // Filter by contractor ID - items are per-contractor
  if (filters?.contractorId) {
    constraints.unshift(where('contractorId', '==', filters.contractorId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let items = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as InventoryItem[];

  // Client-side search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    items = items.filter(
      (item) =>
        item.name.toLowerCase().includes(searchLower) ||
        item.sku?.toLowerCase().includes(searchLower) ||
        item.description?.toLowerCase().includes(searchLower) ||
        item.manufacturer?.toLowerCase().includes(searchLower)
    );
  }

  return items;
}

export async function getInventoryItem(id: string): Promise<InventoryItem | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as InventoryItem;
  }

  return null;
}

export async function createInventoryItem(
  data: Omit<InventoryItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateInventoryItem(
  id: string,
  data: Partial<Omit<InventoryItem, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteInventoryItem(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToInventoryItems(
  callback: (items: InventoryItem[]) => void,
  filters?: InventoryFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('name', 'asc')];

  if (filters?.category) {
    constraints.unshift(where('category', '==', filters.category));
  }

  // Filter by contractor ID - items are per-contractor
  if (filters?.contractorId) {
    constraints.unshift(where('contractorId', '==', filters.contractorId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryItem[];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(searchLower) ||
          item.sku?.toLowerCase().includes(searchLower) ||
          item.description?.toLowerCase().includes(searchLower) ||
          item.manufacturer?.toLowerCase().includes(searchLower)
      );
    }

    callback(items);
  });
}

export function subscribeToInventoryItem(
  id: string,
  callback: (item: InventoryItem | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as InventoryItem);
    } else {
      callback(null);
    }
  });
}

// Get items by category
export async function getInventoryItemsByCategory(
  category: InventoryCategory
): Promise<InventoryItem[]> {
  return getInventoryItems({ category });
}

// Search items
export async function searchInventoryItems(search: string): Promise<InventoryItem[]> {
  return getInventoryItems({ search });
}

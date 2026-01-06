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
import { InventoryLocation, LocationType } from '@/types/inventory';

const COLLECTION = 'inventoryLocations';

export async function getInventoryLocations(type?: LocationType): Promise<InventoryLocation[]> {
  const constraints: QueryConstraint[] = [
    where('isActive', '==', true),
    orderBy('name', 'asc'),
  ];

  if (type) {
    constraints.unshift(where('type', '==', type));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as InventoryLocation[];
}

export async function getInventoryLocation(id: string): Promise<InventoryLocation | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as InventoryLocation;
  }

  return null;
}

export async function getContractorLocation(contractorId: string): Promise<InventoryLocation | null> {
  const q = query(
    collection(db, COLLECTION),
    where('type', '==', 'truck'),
    where('contractorId', '==', contractorId),
    where('isActive', '==', true)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as InventoryLocation;
}

export async function getWarehouseLocations(): Promise<InventoryLocation[]> {
  return getInventoryLocations('warehouse');
}

export async function getTruckLocations(): Promise<InventoryLocation[]> {
  return getInventoryLocations('truck');
}

export async function createInventoryLocation(
  data: Omit<InventoryLocation, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function createTruckLocation(
  contractorId: string,
  contractorName: string
): Promise<string> {
  // Check if truck location already exists
  const existing = await getContractorLocation(contractorId);
  if (existing) {
    return existing.id;
  }

  return createInventoryLocation({
    type: 'truck',
    name: `${contractorName}'s Truck`,
    contractorId,
    contractorName,
    isActive: true,
  });
}

export async function updateInventoryLocation(
  id: string,
  data: Partial<Omit<InventoryLocation, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deactivateInventoryLocation(id: string): Promise<void> {
  await updateInventoryLocation(id, { isActive: false });
}

export async function deleteInventoryLocation(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToInventoryLocations(
  callback: (locations: InventoryLocation[]) => void,
  type?: LocationType
): () => void {
  const constraints: QueryConstraint[] = [
    where('isActive', '==', true),
    orderBy('name', 'asc'),
  ];

  if (type) {
    constraints.unshift(where('type', '==', type));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const locations = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryLocation[];

    callback(locations);
  });
}

export function subscribeToInventoryLocation(
  id: string,
  callback: (location: InventoryLocation | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as InventoryLocation);
    } else {
      callback(null);
    }
  });
}

// Ensure warehouse location exists (for initialization)
export async function ensureWarehouseExists(): Promise<string> {
  const warehouses = await getWarehouseLocations();

  if (warehouses.length > 0) {
    return warehouses[0].id;
  }

  // Create default warehouse
  return createInventoryLocation({
    type: 'warehouse',
    name: 'Main Warehouse',
    isActive: true,
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
    },
  });
}

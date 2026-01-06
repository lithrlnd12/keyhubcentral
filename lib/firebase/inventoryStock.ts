import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './config';
import {
  InventoryStock,
  InventoryCount,
  InventoryCountItem,
  StockFilters,
  StockWithVariance,
  LowStockAlert,
  calculateVariance,
  calculatePercentOfPar,
} from '@/types/inventory';

const STOCK_COLLECTION = 'inventoryStock';
const COUNT_COLLECTION = 'inventoryCounts';

// Generate composite ID for stock document
function getStockId(itemId: string, locationId: string): string {
  return `${itemId}_${locationId}`;
}

export async function getInventoryStock(filters?: StockFilters): Promise<InventoryStock[]> {
  const constraints: QueryConstraint[] = [];

  if (filters?.locationId) {
    constraints.push(where('locationId', '==', filters.locationId));
  }

  if (filters?.itemId) {
    constraints.push(where('itemId', '==', filters.itemId));
  }

  constraints.push(orderBy('itemName', 'asc'));

  const q = query(collection(db, STOCK_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let stock = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as InventoryStock[];

  // Filter below par if requested
  if (filters?.belowPar) {
    stock = stock.filter((s) => s.quantity < s.parLevel);
  }

  return stock;
}

export async function getStockWithVariance(filters?: StockFilters): Promise<StockWithVariance[]> {
  const stock = await getInventoryStock(filters);

  return stock.map((s) => ({
    ...s,
    variance: calculateVariance(s.quantity, s.parLevel),
    percentOfPar: calculatePercentOfPar(s.quantity, s.parLevel),
  }));
}

export async function getStockForItem(itemId: string): Promise<InventoryStock[]> {
  return getInventoryStock({ itemId });
}

export async function getStockForLocation(locationId: string): Promise<InventoryStock[]> {
  return getInventoryStock({ locationId });
}

export async function getStockEntry(
  itemId: string,
  locationId: string
): Promise<InventoryStock | null> {
  const stockId = getStockId(itemId, locationId);
  const docRef = doc(db, STOCK_COLLECTION, stockId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as InventoryStock;
  }

  return null;
}

export async function updateStock(
  itemId: string,
  locationId: string,
  quantity: number,
  itemName: string,
  locationName: string,
  parLevel: number,
  countedBy: string,
  countedByName: string
): Promise<void> {
  const stockId = getStockId(itemId, locationId);
  const docRef = doc(db, STOCK_COLLECTION, stockId);

  await setDoc(docRef, {
    itemId,
    itemName,
    locationId,
    locationName,
    quantity,
    parLevel,
    lastCounted: serverTimestamp(),
    countedBy,
    countedByName,
  });
}

export async function getLowStockItems(locationId?: string): Promise<LowStockAlert[]> {
  const stock = await getInventoryStock({
    locationId,
    belowPar: true,
  });

  return stock.map((s) => ({
    itemId: s.itemId,
    itemName: s.itemName,
    locationId: s.locationId,
    locationName: s.locationName,
    currentQuantity: s.quantity,
    parLevel: s.parLevel,
    shortage: s.parLevel - s.quantity,
  }));
}

export async function getLowStockCount(locationId?: string): Promise<number> {
  const alerts = await getLowStockItems(locationId);
  return alerts.length;
}

// Inventory Count Session
export async function submitInventoryCount(
  locationId: string,
  locationName: string,
  countedBy: string,
  countedByName: string,
  items: InventoryCountItem[],
  notes?: string
): Promise<string> {
  const batch = writeBatch(db);

  // Update stock for each item
  for (const item of items) {
    const stockId = getStockId(item.itemId, locationId);
    const stockRef = doc(db, STOCK_COLLECTION, stockId);

    batch.set(stockRef, {
      itemId: item.itemId,
      itemName: item.itemName,
      locationId,
      locationName,
      quantity: item.newQuantity,
      parLevel: item.parLevel,
      lastCounted: Timestamp.now(),
      countedBy,
      countedByName,
    });
  }

  await batch.commit();

  // Create count record
  const itemsBelowPar = items.filter((i) => i.newQuantity < i.parLevel).length;

  const countRef = await addDoc(collection(db, COUNT_COLLECTION), {
    locationId,
    locationName,
    countedBy,
    countedByName,
    countedAt: serverTimestamp(),
    items,
    notes: notes || null,
    totalItems: items.length,
    itemsBelowPar,
  });

  return countRef.id;
}

export async function getInventoryCounts(locationId?: string): Promise<InventoryCount[]> {
  const constraints: QueryConstraint[] = [orderBy('countedAt', 'desc')];

  if (locationId) {
    constraints.unshift(where('locationId', '==', locationId));
  }

  const q = query(collection(db, COUNT_COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as InventoryCount[];
}

export async function getInventoryCount(id: string): Promise<InventoryCount | null> {
  const docRef = doc(db, COUNT_COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as InventoryCount;
  }

  return null;
}

export async function getRecentCounts(limit: number = 5): Promise<InventoryCount[]> {
  const q = query(
    collection(db, COUNT_COLLECTION),
    orderBy('countedAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.slice(0, limit).map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as InventoryCount[];
}

// Real-time subscriptions
export function subscribeToInventoryStock(
  callback: (stock: StockWithVariance[]) => void,
  filters?: StockFilters
): () => void {
  const constraints: QueryConstraint[] = [];

  if (filters?.locationId) {
    constraints.push(where('locationId', '==', filters.locationId));
  }

  if (filters?.itemId) {
    constraints.push(where('itemId', '==', filters.itemId));
  }

  constraints.push(orderBy('itemName', 'asc'));

  const q = query(collection(db, STOCK_COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let stock = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InventoryStock[];

    // Filter below par if requested
    if (filters?.belowPar) {
      stock = stock.filter((s) => s.quantity < s.parLevel);
    }

    const stockWithVariance: StockWithVariance[] = stock.map((s) => ({
      ...s,
      variance: calculateVariance(s.quantity, s.parLevel),
      percentOfPar: calculatePercentOfPar(s.quantity, s.parLevel),
    }));

    callback(stockWithVariance);
  });
}

export function subscribeToLowStockAlerts(
  callback: (alerts: LowStockAlert[]) => void,
  locationId?: string
): () => void {
  return subscribeToInventoryStock((stock) => {
    const alerts: LowStockAlert[] = stock
      .filter((s) => s.quantity < s.parLevel)
      .map((s) => ({
        itemId: s.itemId,
        itemName: s.itemName,
        locationId: s.locationId,
        locationName: s.locationName,
        currentQuantity: s.quantity,
        parLevel: s.parLevel,
        shortage: s.parLevel - s.quantity,
      }));

    callback(alerts);
  }, { locationId, belowPar: true });
}

// Get aggregate stock for an item across all locations
export async function getTotalStockForItem(itemId: string): Promise<{
  totalQuantity: number;
  totalParLevel: number;
  locations: InventoryStock[];
}> {
  const stock = await getStockForItem(itemId);

  const totalQuantity = stock.reduce((sum, s) => sum + s.quantity, 0);
  const totalParLevel = stock.reduce((sum, s) => sum + s.parLevel, 0);

  return {
    totalQuantity,
    totalParLevel,
    locations: stock,
  };
}

// Add stock from a receipt (increases quantity by the specified amount)
export async function addStockFromReceipt(
  itemId: string,
  locationId: string,
  quantityToAdd: number,
  itemName: string,
  locationName: string,
  parLevel: number,
  addedBy: string,
  addedByName: string
): Promise<void> {
  const stockId = getStockId(itemId, locationId);
  const docRef = doc(db, STOCK_COLLECTION, stockId);
  const docSnap = await getDoc(docRef);

  let newQuantity = quantityToAdd;

  if (docSnap.exists()) {
    // Add to existing quantity
    const existingStock = docSnap.data() as InventoryStock;
    newQuantity = existingStock.quantity + quantityToAdd;
  }

  await setDoc(docRef, {
    itemId,
    itemName,
    locationId,
    locationName,
    quantity: newQuantity,
    parLevel,
    lastCounted: serverTimestamp(),
    countedBy: addedBy,
    countedByName: addedByName,
  });
}

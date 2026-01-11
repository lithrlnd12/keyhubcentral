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
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './config';
import {
  Receipt,
  ReceiptItem,
  ReceiptStatus,
  ReceiptFilters,
} from '@/types/inventory';

const COLLECTION = 'receipts';

export async function getReceipts(filters?: ReceiptFilters): Promise<Receipt[]> {
  const constraints: QueryConstraint[] = [orderBy('uploadedAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.uploadedBy) {
    constraints.unshift(where('uploadedBy', '==', filters.uploadedBy));
  }

  if (filters?.locationId) {
    constraints.unshift(where('locationId', '==', filters.locationId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let receipts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Receipt[];

  // Client-side date filtering
  if (filters?.startDate) {
    const startTimestamp = Timestamp.fromDate(filters.startDate);
    receipts = receipts.filter((r) => r.uploadedAt >= startTimestamp);
  }

  if (filters?.endDate) {
    const endTimestamp = Timestamp.fromDate(filters.endDate);
    receipts = receipts.filter((r) => r.uploadedAt <= endTimestamp);
  }

  return receipts;
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Receipt;
  }

  return null;
}

export async function uploadReceiptImage(
  file: File,
  userId: string
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${userId}/${timestamp}_${file.name}`;
  const storageRef = ref(storage, `receipts/${fileName}`);

  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function createReceipt(
  imageUrl: string,
  uploadedBy: string,
  uploadedByName: string,
  locationId?: string,
  locationName?: string
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    uploadedBy,
    uploadedByName,
    uploadedAt: serverTimestamp(),
    imageUrl,
    status: 'pending' as ReceiptStatus,
    items: [],
    locationId: locationId || null,
    locationName: locationName || null,
  });

  return docRef.id;
}

export async function updateReceiptStatus(
  id: string,
  status: ReceiptStatus,
  errorMessage?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  const updateData: Record<string, unknown> = { status };

  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }

  await updateDoc(docRef, updateData);
}

export async function updateReceiptParsedData(
  id: string,
  parsedData: Receipt['parsedData']
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);

  await updateDoc(docRef, {
    parsedData,
    vendor: parsedData?.vendor || null,
    purchaseDate: parsedData?.date ? Timestamp.fromDate(new Date(parsedData.date)) : null,
    subtotal: parsedData?.subtotal || null,
    tax: parsedData?.tax || null,
    total: parsedData?.total || null,
    items: parsedData?.items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
    })) || [],
    status: 'parsed' as ReceiptStatus,
  });
}

export async function updateReceiptItems(
  id: string,
  items: ReceiptItem[]
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, { items });
}

export async function updateReceiptVendor(
  id: string,
  vendor: string,
  purchaseDate?: Date,
  total?: number
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  const updateData: Record<string, unknown> = { vendor };

  if (purchaseDate) {
    updateData.purchaseDate = Timestamp.fromDate(purchaseDate);
  }

  if (total !== undefined) {
    updateData.total = total;
  }

  await updateDoc(docRef, updateData);
}

export async function updateReceiptLocation(
  id: string,
  locationId: string,
  locationName: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    locationId,
    locationName,
  });
}

export async function updateReceiptCompany(
  id: string,
  company: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    company,
  });
}

export async function verifyReceipt(
  id: string,
  verifiedBy: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'verified' as ReceiptStatus,
    verifiedBy,
    verifiedAt: serverTimestamp(),
  });
}

export async function addReceiptToPL(
  id: string,
  plExpenseId: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'added_to_pl' as ReceiptStatus,
    plExpenseId,
    addedToPLAt: serverTimestamp(),
  });
}

export async function linkReceiptItemToInventory(
  receiptId: string,
  itemIndex: number,
  inventoryItemId: string,
  inventoryItemName: string
): Promise<void> {
  const receipt = await getReceipt(receiptId);
  if (!receipt) {
    throw new Error('Receipt not found');
  }

  const items = [...receipt.items];
  if (itemIndex >= 0 && itemIndex < items.length) {
    items[itemIndex] = {
      ...items[itemIndex],
      inventoryItemId,
      inventoryItemName,
    };

    await updateReceiptItems(receiptId, items);
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

// Real-time subscriptions
export function subscribeToReceipts(
  callback: (receipts: Receipt[]) => void,
  filters?: ReceiptFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('uploadedAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.uploadedBy) {
    constraints.unshift(where('uploadedBy', '==', filters.uploadedBy));
  }

  if (filters?.locationId) {
    constraints.unshift(where('locationId', '==', filters.locationId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let receipts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Receipt[];

    // Client-side date filtering
    if (filters?.startDate) {
      const startTimestamp = Timestamp.fromDate(filters.startDate);
      receipts = receipts.filter((r) => r.uploadedAt >= startTimestamp);
    }

    if (filters?.endDate) {
      const endTimestamp = Timestamp.fromDate(filters.endDate);
      receipts = receipts.filter((r) => r.uploadedAt <= endTimestamp);
    }

    callback(receipts);
  });
}

export function subscribeToReceipt(
  id: string,
  callback: (receipt: Receipt | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Receipt);
    } else {
      callback(null);
    }
  });
}

// Get pending receipts count
export async function getPendingReceiptsCount(): Promise<number> {
  const receipts = await getReceipts({ status: 'pending' });
  return receipts.length;
}

// Get receipts that need verification
export async function getReceiptsNeedingVerification(): Promise<Receipt[]> {
  return getReceipts({ status: 'parsed' });
}

// Upload and create receipt in one call
export async function uploadAndCreateReceipt(
  file: File,
  uploadedBy: string,
  uploadedByName: string,
  locationId?: string,
  locationName?: string
): Promise<{ receiptId: string; imageUrl: string }> {
  const imageUrl = await uploadReceiptImage(file, uploadedBy);
  const receiptId = await createReceipt(
    imageUrl,
    uploadedBy,
    uploadedByName,
    locationId,
    locationName
  );

  return { receiptId, imageUrl };
}

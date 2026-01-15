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
import { db } from './config';
import {
  LaborRequest,
  LaborRequestStatus,
  LaborRequestFilters,
  StatusChange,
} from '@/types/partner';

const COLLECTION = 'laborRequests';

export async function getLaborRequests(filters?: LaborRequestFilters): Promise<LaborRequest[]> {
  // If partnerId filter is provided but empty, return empty results
  if (filters?.partnerId !== undefined && !filters.partnerId) {
    return [];
  }

  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.partnerId) {
    constraints.unshift(where('partnerId', '==', filters.partnerId));
  }

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.workType) {
    constraints.unshift(where('workType', '==', filters.workType));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let requests = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LaborRequest[];

  // Client-side search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    requests = requests.filter(
      (request) =>
        request.requestNumber?.toLowerCase().includes(searchLower) ||
        request.partnerCompany?.toLowerCase().includes(searchLower) ||
        request.description?.toLowerCase().includes(searchLower) ||
        request.location.city?.toLowerCase().includes(searchLower)
    );
  }

  return requests;
}

export async function getLaborRequest(id: string): Promise<LaborRequest | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as LaborRequest;
  }

  return null;
}

export async function createLaborRequest(
  data: Omit<LaborRequest, 'id' | 'requestNumber' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'reviewedAt' | 'reviewedBy' | 'completedAt' | 'assignedContractorIds' | 'status'>
): Promise<string> {
  const requestNumber = await generateRequestNumber();

  const initialStatusChange: StatusChange = {
    status: 'new',
    changedAt: Timestamp.now(),
    changedBy: data.submittedBy,
    notes: 'Request submitted',
  };

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    requestNumber,
    status: 'new',
    statusHistory: [initialStatusChange],
    assignedContractorIds: [],
    reviewedAt: null,
    reviewedBy: null,
    completedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateLaborRequest(
  id: string,
  data: Partial<Omit<LaborRequest, 'id' | 'createdAt' | 'requestNumber'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateLaborRequestStatus(
  id: string,
  status: LaborRequestStatus,
  changedBy: string,
  notes?: string
): Promise<void> {
  const request = await getLaborRequest(id);
  if (!request) {
    throw new Error('Labor request not found');
  }

  const statusChange: StatusChange = {
    status,
    changedAt: Timestamp.now(),
    changedBy,
    notes: notes || null,
  };

  const updateData: Record<string, unknown> = {
    status,
    statusHistory: [...request.statusHistory, statusChange],
    updatedAt: serverTimestamp(),
  };

  if (status === 'reviewed') {
    updateData.reviewedAt = serverTimestamp();
    updateData.reviewedBy = changedBy;
  }

  if (status === 'complete') {
    updateData.completedAt = serverTimestamp();
  }

  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, updateData);
}

export async function assignContractorsToRequest(
  id: string,
  contractorIds: string[],
  assignedBy: string
): Promise<void> {
  const request = await getLaborRequest(id);
  if (!request) {
    throw new Error('Labor request not found');
  }

  const statusChange: StatusChange = {
    status: 'assigned',
    changedAt: Timestamp.now(),
    changedBy: assignedBy,
    notes: `Assigned ${contractorIds.length} contractor(s)`,
  };

  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    assignedContractorIds: contractorIds,
    status: 'assigned',
    statusHistory: [...request.statusHistory, statusChange],
    updatedAt: serverTimestamp(),
  });
}

export async function deleteLaborRequest(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToLaborRequests(
  callback: (requests: LaborRequest[]) => void,
  filters?: LaborRequestFilters
): () => void {
  // If partnerId filter is provided but empty, return empty results
  // This prevents querying all documents when user doesn't have a partnerId
  if (filters?.partnerId !== undefined && !filters.partnerId) {
    callback([]);
    return () => {};
  }

  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.partnerId) {
    constraints.unshift(where('partnerId', '==', filters.partnerId));
  }

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.workType) {
    constraints.unshift(where('workType', '==', filters.workType));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let requests = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LaborRequest[];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      requests = requests.filter(
        (request) =>
          request.requestNumber?.toLowerCase().includes(searchLower) ||
          request.partnerCompany?.toLowerCase().includes(searchLower) ||
          request.description?.toLowerCase().includes(searchLower) ||
          request.location.city?.toLowerCase().includes(searchLower)
      );
    }

    callback(requests);
  });
}

export function subscribeToLaborRequest(
  id: string,
  callback: (request: LaborRequest | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as LaborRequest);
    } else {
      callback(null);
    }
  });
}

// Generate next request number using timestamp (no read required)
export async function generateRequestNumber(): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const time = String(now.getTime()).slice(-6); // Last 6 digits of timestamp for uniqueness

  return `LR-${year}${month}${day}-${time}`;
}

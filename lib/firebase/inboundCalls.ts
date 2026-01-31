import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
  limit,
} from 'firebase/firestore';
import { db } from './config';
import {
  InboundCall,
  InboundCallStatus,
  ClosedReason,
  CreateInboundCallData,
} from '@/types/inboundCall';
import { createLead } from './leads';
import { LeadSource, LeadQuality, LeadStatus } from '@/types/lead';

const COLLECTION = 'inboundCalls';

export interface InboundCallFilters {
  status?: InboundCallStatus;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

/**
 * Get inbound calls with optional filters
 */
export async function getInboundCalls(filters?: InboundCallFilters): Promise<InboundCall[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.dateFrom) {
    constraints.unshift(where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)));
  }

  if (filters?.dateTo) {
    constraints.unshift(where('createdAt', '<=', Timestamp.fromDate(filters.dateTo)));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let calls = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as InboundCall[];

  // Client-side search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    calls = calls.filter(
      (call) =>
        call.caller.name?.toLowerCase().includes(searchLower) ||
        call.caller.phone.includes(searchLower) ||
        call.analysis.projectType?.toLowerCase().includes(searchLower) ||
        call.summary?.toLowerCase().includes(searchLower)
    );
  }

  return calls;
}

/**
 * Get a single inbound call by ID
 */
export async function getInboundCall(id: string): Promise<InboundCall | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as InboundCall;
  }

  return null;
}

/**
 * Create a new inbound call record (used by webhook)
 */
export async function createInboundCall(
  data: CreateInboundCallData
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an inbound call's status
 */
export async function updateInboundCallStatus(
  id: string,
  status: InboundCallStatus,
  userId: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  // If marking as reviewed, add reviewer info
  if (status === 'reviewed') {
    updateData.reviewedBy = userId;
    updateData.reviewedAt = serverTimestamp();
  }

  await updateDoc(docRef, updateData);
}

/**
 * Close an inbound call with a reason
 */
export async function closeInboundCall(
  id: string,
  reason: ClosedReason,
  userId: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'closed',
    closedReason: reason,
    reviewedBy: userId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Convert an inbound call to a lead
 */
export async function convertInboundCallToLead(
  id: string,
  userId: string
): Promise<string> {
  // Get the call data
  const call = await getInboundCall(id);
  if (!call) {
    throw new Error('Inbound call not found');
  }

  // Determine quality based on urgency
  let quality: LeadQuality = 'warm';
  if (call.analysis.urgency === 'urgent') {
    quality = 'hot';
  } else if (call.analysis.urgency === 'exploring') {
    quality = 'warm';
  }

  // Create the lead
  const leadId = await createLead({
    source: 'other' as LeadSource, // Inbound call
    campaignId: null,
    market: '', // Will need to be set later
    trade: call.analysis.projectType || 'general',
    customer: {
      name: call.caller.name || 'Unknown Caller',
      phone: call.caller.phone,
      email: null,
      address: {
        street: '',
        city: '',
        state: '',
        zip: '',
        lat: null,
        lng: null,
      },
      notes: call.analysis.notes || call.summary || null,
    },
    quality,
    status: 'new' as LeadStatus,
    assignedTo: null,
    assignedType: null,
    returnReason: null,
    returnedAt: null,
    smsCallOptIn: true, // They called us, so implicit opt-in
  });

  // Update the call with converted status and linked lead
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'converted',
    linkedLeadId: leadId,
    reviewedBy: userId,
    reviewedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return leadId;
}

/**
 * Subscribe to inbound calls with real-time updates
 */
export function subscribeToInboundCalls(
  callback: (calls: InboundCall[]) => void,
  filters?: InboundCallFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.dateFrom) {
    constraints.unshift(where('createdAt', '>=', Timestamp.fromDate(filters.dateFrom)));
  }

  if (filters?.dateTo) {
    constraints.unshift(where('createdAt', '<=', Timestamp.fromDate(filters.dateTo)));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let calls = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as InboundCall[];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      calls = calls.filter(
        (call) =>
          call.caller.name?.toLowerCase().includes(searchLower) ||
          call.caller.phone.includes(searchLower) ||
          call.analysis.projectType?.toLowerCase().includes(searchLower) ||
          call.summary?.toLowerCase().includes(searchLower)
      );
    }

    callback(calls);
  });
}

/**
 * Subscribe to a single inbound call
 */
export function subscribeToInboundCall(
  id: string,
  callback: (call: InboundCall | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as InboundCall);
    } else {
      callback(null);
    }
  });
}

/**
 * Subscribe to count of new calls (for nav badge)
 */
export function subscribeToNewCallsCount(
  callback: (count: number) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'new'),
    orderBy('createdAt', 'desc'),
    limit(100) // Cap at 100 for performance
  );

  return onSnapshot(q, (snapshot) => {
    callback(snapshot.size);
  });
}

/**
 * Get count of new calls
 */
export async function getNewCallsCount(): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'new'),
    limit(100)
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

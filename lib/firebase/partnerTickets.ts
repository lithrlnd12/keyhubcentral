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
  PartnerServiceTicket,
  PartnerTicketStatus,
  PartnerTicketFilters,
  PartnerStatusChange,
} from '@/types/partner';

const COLLECTION = 'partnerServiceTickets';

export async function getPartnerTickets(filters?: PartnerTicketFilters): Promise<PartnerServiceTicket[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.partnerId) {
    constraints.unshift(where('partnerId', '==', filters.partnerId));
  }

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.urgency) {
    constraints.unshift(where('urgency', '==', filters.urgency));
  }

  if (filters?.assignedTechId) {
    constraints.unshift(where('assignedTechId', '==', filters.assignedTechId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let tickets = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as PartnerServiceTicket[];

  // Client-side search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    tickets = tickets.filter(
      (ticket) =>
        ticket.ticketNumber?.toLowerCase().includes(searchLower) ||
        ticket.partnerCompany?.toLowerCase().includes(searchLower) ||
        ticket.customerName?.toLowerCase().includes(searchLower) ||
        ticket.issueDescription?.toLowerCase().includes(searchLower) ||
        ticket.serviceAddress.city?.toLowerCase().includes(searchLower)
    );
  }

  return tickets;
}

export async function getPartnerTicket(id: string): Promise<PartnerServiceTicket | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as PartnerServiceTicket;
  }

  return null;
}

export async function createPartnerTicket(
  data: Omit<PartnerServiceTicket, 'id' | 'ticketNumber' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'resolvedAt' | 'assignedTechId' | 'scheduledDate' | 'resolution'>
): Promise<string> {
  const ticketNumber = await generatePartnerTicketNumber();

  const initialStatusChange: PartnerStatusChange = {
    status: 'new',
    changedAt: Timestamp.now(),
    changedBy: data.submittedBy,
    notes: 'Ticket submitted',
  };

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    ticketNumber,
    status: 'new',
    statusHistory: [initialStatusChange],
    assignedTechId: null,
    scheduledDate: null,
    resolution: null,
    resolvedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updatePartnerTicket(
  id: string,
  data: Partial<Omit<PartnerServiceTicket, 'id' | 'createdAt' | 'ticketNumber'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updatePartnerTicketStatus(
  id: string,
  status: PartnerTicketStatus,
  changedBy: string,
  notes?: string
): Promise<void> {
  const ticket = await getPartnerTicket(id);
  if (!ticket) {
    throw new Error('Partner ticket not found');
  }

  const statusChange: PartnerStatusChange = {
    status,
    changedAt: Timestamp.now(),
    changedBy,
    notes: notes || null,
  };

  const updateData: Record<string, unknown> = {
    status,
    statusHistory: [...ticket.statusHistory, statusChange],
    updatedAt: serverTimestamp(),
  };

  if (status === 'complete') {
    updateData.resolvedAt = serverTimestamp();
  }

  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, updateData);
}

export async function assignTechToTicket(
  id: string,
  techId: string,
  assignedBy: string,
  scheduledDate?: Timestamp
): Promise<void> {
  const ticket = await getPartnerTicket(id);
  if (!ticket) {
    throw new Error('Partner ticket not found');
  }

  const newStatus: PartnerTicketStatus = scheduledDate ? 'scheduled' : 'assigned';

  const statusChange: PartnerStatusChange = {
    status: newStatus,
    changedAt: Timestamp.now(),
    changedBy: assignedBy,
    notes: scheduledDate
      ? `Assigned technician and scheduled for ${scheduledDate.toDate().toLocaleDateString()}`
      : 'Assigned technician',
  };

  const updateData: Record<string, unknown> = {
    assignedTechId: techId,
    status: newStatus,
    statusHistory: [...ticket.statusHistory, statusChange],
    updatedAt: serverTimestamp(),
  };

  if (scheduledDate) {
    updateData.scheduledDate = scheduledDate;
  }

  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, updateData);
}

export async function resolvePartnerTicket(
  id: string,
  resolution: string,
  resolvedBy: string
): Promise<void> {
  const ticket = await getPartnerTicket(id);
  if (!ticket) {
    throw new Error('Partner ticket not found');
  }

  const statusChange: PartnerStatusChange = {
    status: 'complete',
    changedAt: Timestamp.now(),
    changedBy: resolvedBy,
    notes: resolution,
  };

  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    resolution,
    status: 'complete',
    statusHistory: [...ticket.statusHistory, statusChange],
    resolvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function deletePartnerTicket(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToPartnerTickets(
  callback: (tickets: PartnerServiceTicket[]) => void,
  filters?: PartnerTicketFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.partnerId) {
    constraints.unshift(where('partnerId', '==', filters.partnerId));
  }

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.urgency) {
    constraints.unshift(where('urgency', '==', filters.urgency));
  }

  if (filters?.assignedTechId) {
    constraints.unshift(where('assignedTechId', '==', filters.assignedTechId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let tickets = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as PartnerServiceTicket[];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      tickets = tickets.filter(
        (ticket) =>
          ticket.ticketNumber?.toLowerCase().includes(searchLower) ||
          ticket.partnerCompany?.toLowerCase().includes(searchLower) ||
          ticket.customerName?.toLowerCase().includes(searchLower) ||
          ticket.issueDescription?.toLowerCase().includes(searchLower) ||
          ticket.serviceAddress.city?.toLowerCase().includes(searchLower)
      );
    }

    callback(tickets);
  });
}

export function subscribeToPartnerTicket(
  id: string,
  callback: (ticket: PartnerServiceTicket | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as PartnerServiceTicket);
    } else {
      callback(null);
    }
  });
}

// Generate next ticket number
export async function generatePartnerTicketNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  // Find the highest ticket number for this year
  let maxNumber = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.ticketNumber?.startsWith(`PST-${year}-`)) {
      const num = parseInt(data.ticketNumber.split('-')[2], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  return `PST-${year}-${String(maxNumber + 1).padStart(4, '0')}`;
}

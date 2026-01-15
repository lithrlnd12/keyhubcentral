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
import { Lead, LeadStatus, LeadSource, LeadQuality, AssignedType } from '@/types/lead';
import { JobType, JobStatus } from '@/types/job';
import { createJob, generateJobNumber } from './jobs';

const COLLECTION = 'leads';

export interface LeadFilters {
  status?: LeadStatus;
  source?: LeadSource;
  quality?: LeadQuality;
  assignedTo?: string;
  assignedType?: AssignedType;
  campaignId?: string;
  search?: string;
}

export async function getLeads(filters?: LeadFilters): Promise<Lead[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.source) {
    constraints.unshift(where('source', '==', filters.source));
  }

  if (filters?.quality) {
    constraints.unshift(where('quality', '==', filters.quality));
  }

  if (filters?.assignedTo) {
    constraints.unshift(where('assignedTo', '==', filters.assignedTo));
  }

  if (filters?.assignedType) {
    constraints.unshift(where('assignedType', '==', filters.assignedType));
  }

  if (filters?.campaignId) {
    constraints.unshift(where('campaignId', '==', filters.campaignId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let leads = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Lead[];

  // Client-side search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    leads = leads.filter(
      (lead) =>
        lead.customer.name?.toLowerCase().includes(searchLower) ||
        lead.customer.email?.toLowerCase().includes(searchLower) ||
        lead.customer.phone?.includes(searchLower) ||
        lead.customer.address.city?.toLowerCase().includes(searchLower) ||
        lead.market?.toLowerCase().includes(searchLower) ||
        lead.trade?.toLowerCase().includes(searchLower)
    );
  }

  return leads;
}

export async function getLead(id: string): Promise<Lead | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Lead;
  }

  return null;
}

export async function getLeadsByAssignee(userId: string): Promise<Lead[]> {
  const q = query(
    collection(db, COLLECTION),
    where('assignedTo', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Lead[];
}

export async function createLead(
  data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateLead(
  id: string,
  data: Partial<Omit<Lead, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function assignLead(
  id: string,
  assignedTo: string,
  assignedType: AssignedType
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    assignedTo,
    assignedType,
    status: 'assigned',
    updatedAt: serverTimestamp(),
  });
}

export async function returnLead(
  id: string,
  returnReason: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'returned',
    returnReason,
    returnedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function convertLead(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'converted',
    updatedAt: serverTimestamp(),
  });
}

export async function convertLeadToJob(
  leadId: string,
  jobType: JobType
): Promise<string> {
  // Get the lead
  const lead = await getLead(leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Generate job number
  const jobNumber = await generateJobNumber();

  // Map lead customer to job customer (handle null phone/email)
  const customer = {
    name: lead.customer.name,
    phone: lead.customer.phone || '',
    email: lead.customer.email || '',
    address: lead.customer.address,
  };

  // Create job data
  const jobData = {
    jobNumber,
    customer,
    type: jobType,
    status: 'lead' as JobStatus,
    salesRepId: lead.assignedTo,
    crewIds: [],
    pmId: null,
    leadId: leadId,
    costs: {
      materialProjected: 0,
      materialActual: 0,
      laborProjected: 0,
      laborActual: 0,
    },
    dates: {
      created: Timestamp.now(),
      sold: null,
      scheduledStart: null,
      actualStart: null,
      targetCompletion: null,
      actualCompletion: null,
      paidInFull: null,
    },
    warranty: {
      startDate: null,
      endDate: null,
      status: 'pending' as const,
    },
    notes: lead.customer.notes || '',
  };

  // Create the job
  const jobId = await createJob(jobData);

  // Update lead with converted status and job link
  const leadRef = doc(db, COLLECTION, leadId);
  await updateDoc(leadRef, {
    status: 'converted',
    linkedJobId: jobId,
    updatedAt: serverTimestamp(),
  });

  return jobId;
}

export async function deleteLead(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToLeads(
  callback: (leads: Lead[]) => void,
  filters?: LeadFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.source) {
    constraints.unshift(where('source', '==', filters.source));
  }

  if (filters?.quality) {
    constraints.unshift(where('quality', '==', filters.quality));
  }

  if (filters?.assignedTo) {
    constraints.unshift(where('assignedTo', '==', filters.assignedTo));
  }

  if (filters?.assignedType) {
    constraints.unshift(where('assignedType', '==', filters.assignedType));
  }

  if (filters?.campaignId) {
    constraints.unshift(where('campaignId', '==', filters.campaignId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let leads = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Lead[];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      leads = leads.filter(
        (lead) =>
          lead.customer.name?.toLowerCase().includes(searchLower) ||
          lead.customer.email?.toLowerCase().includes(searchLower) ||
          lead.customer.phone?.includes(searchLower) ||
          lead.customer.address.city?.toLowerCase().includes(searchLower) ||
          lead.market?.toLowerCase().includes(searchLower) ||
          lead.trade?.toLowerCase().includes(searchLower)
      );
    }

    callback(leads);
  });
}

export function subscribeToLead(
  id: string,
  callback: (lead: Lead | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Lead);
    } else {
      callback(null);
    }
  });
}

// Get lead count by status
export async function getLeadCountsByStatus(): Promise<Record<LeadStatus, number>> {
  const q = query(collection(db, COLLECTION));
  const snapshot = await getDocs(q);

  const counts: Record<LeadStatus, number> = {
    new: 0,
    assigned: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    lost: 0,
    returned: 0,
  };

  snapshot.docs.forEach((doc) => {
    const status = doc.data().status as LeadStatus;
    if (status in counts) {
      counts[status]++;
    }
  });

  return counts;
}

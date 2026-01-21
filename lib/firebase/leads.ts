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
import { Contractor } from '@/types/contractor';
import {
  calculateAddressDistance,
  isWithinServiceRadius,
} from '@/lib/utils/distance';

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
  data: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'smsCallOptInAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    // Set opt-in timestamp if smsCallOptIn is true
    smsCallOptInAt: data.smsCallOptIn ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateLead(
  id: string,
  data: Partial<Omit<Lead, 'id' | 'createdAt'>> & { _newSmsOptIn?: boolean }
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  const { _newSmsOptIn: newSmsOptIn, ...updateData } = data;

  // If this is a new SMS opt-in, set the timestamp
  const finalData = {
    ...updateData,
    ...(newSmsOptIn ? { smsCallOptInAt: serverTimestamp() } : {}),
    updatedAt: serverTimestamp(),
  };

  await updateDoc(docRef, finalData);
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

export interface ConvertLeadOptions {
  contractUrl?: string;
  contractFileName?: string;
  downPaymentUrl?: string;
  downPaymentAmount?: number;
  contractValue?: number;
}

export async function convertLeadToJob(
  leadId: string,
  jobType: JobType,
  currentUserId: string,
  options?: ConvertLeadOptions
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

  // Always use current user as salesRepId to satisfy Firestore rules
  // (sales reps can only create jobs where salesRepId == their uid)
  // The person converting the lead becomes the sales rep on the job
  const salesRepId = currentUserId;

  // Build documents object if provided
  const documents: Record<string, unknown> = {};
  if (options?.contractUrl) {
    documents.contract = {
      url: options.contractUrl,
      uploadedAt: Timestamp.now(),
      uploadedBy: currentUserId,
      fileName: options.contractFileName || 'contract',
    };
  }
  if (options?.downPaymentUrl && options?.downPaymentAmount) {
    documents.downPayment = {
      url: options.downPaymentUrl,
      uploadedAt: Timestamp.now(),
      uploadedBy: currentUserId,
      amount: options.downPaymentAmount,
    };
  }

  // Build commission object if contract value provided
  const commission = options?.contractValue
    ? {
        contractValue: options.contractValue,
        rate: 0, // Will be set based on sales rep tier
        amount: 0,
        status: 'pending' as const,
      }
    : undefined;

  // Create job data
  const jobData = {
    jobNumber,
    customer,
    type: jobType,
    status: 'lead' as JobStatus,
    salesRepId,
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
    ...(Object.keys(documents).length > 0 ? { documents } : {}),
    ...(commission ? { commission } : {}),
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

// Sales Rep Auto-Assignment
// Weights for sales rep scoring (must sum to 1)
const SALES_REP_WEIGHTS = {
  distance: 0.5,
  rating: 0.5,
};

const DEFAULT_SERVICE_RADIUS_MILES = 50;

interface SalesRepScore {
  contractorId: string;
  contractor: Contractor;
  score: number;
  distance: number;
  rating: number;
  isWithinServiceRadius: boolean;
}

/**
 * Auto-assign a lead to the best available sales rep based on distance and rating
 *
 * Algorithm:
 * 1. Get lead with geocoded address
 * 2. Get active contractors with sales_rep trade
 * 3. Calculate distance + rating score for each (50% + 50%)
 * 4. Filter by service radius compliance
 * 5. Auto-assign to highest-scoring sales rep
 *
 * @returns The assigned contractor ID or null if no suitable sales rep found
 */
export async function autoAssignLeadToSalesRep(leadId: string): Promise<string | null> {
  // 1. Get lead with geocoded address
  const lead = await getLead(leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Check if lead has geocoded coordinates
  if (!lead.customer.address.lat || !lead.customer.address.lng) {
    console.warn('Lead address is not geocoded, cannot auto-assign');
    return null;
  }

  // 2. Get active contractors with sales_rep trade
  const contractorsQuery = query(
    collection(db, 'contractors'),
    where('status', '==', 'active')
  );
  const contractorsSnapshot = await getDocs(contractorsQuery);

  const salesReps: Contractor[] = contractorsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Contractor))
    .filter(c => c.trades.includes('sales_rep'));

  if (salesReps.length === 0) {
    console.warn('No active sales reps found for auto-assignment');
    return null;
  }

  // 3. Score each sales rep
  const scores: SalesRepScore[] = [];

  for (const contractor of salesReps) {
    // Calculate distance
    const distance = calculateAddressDistance(contractor.address, lead.customer.address);

    // Skip if we can't calculate distance (missing coordinates)
    if (distance === null) {
      continue;
    }

    // Check service radius
    const serviceRadius = contractor.serviceRadius || DEFAULT_SERVICE_RADIUS_MILES;
    const withinRadius = isWithinServiceRadius(distance, serviceRadius);

    // Only consider contractors within their service radius
    if (!withinRadius) {
      continue;
    }

    // Get rating
    const rating = contractor.rating?.overall || 3;

    // Calculate scores (0-100 each)
    // Distance score: closer is better (100 at 0 mi, 0 at 2x service radius)
    const distanceScore = Math.max(0, 100 - (distance / (serviceRadius * 2)) * 100);

    // Rating score: higher is better (1-5 -> 0-100)
    const ratingScore = Math.min(100, Math.max(0, rating * 20));

    // Combined score with weights
    const combinedScore =
      distanceScore * SALES_REP_WEIGHTS.distance +
      ratingScore * SALES_REP_WEIGHTS.rating;

    scores.push({
      contractorId: contractor.id,
      contractor,
      score: Math.round(combinedScore),
      distance,
      rating,
      isWithinServiceRadius: withinRadius,
    });
  }

  // 4. Sort by score (highest first) and pick the top one
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    console.warn('No suitable sales reps found within service radius');
    return null;
  }

  const topSalesRep = scores[0];

  // 5. Update lead with auto-assignment info
  const leadRef = doc(db, COLLECTION, leadId);
  await updateDoc(leadRef, {
    assignedTo: topSalesRep.contractor.userId,
    assignedType: 'internal',
    status: 'assigned',
    autoAssigned: true,
    autoAssignedAt: serverTimestamp(),
    autoAssignedDistance: topSalesRep.distance,
    updatedAt: serverTimestamp(),
  });

  return topSalesRep.contractor.userId;
}

/**
 * Get available sales reps for a lead location, scored and sorted
 * Useful for displaying recommendations to an admin before manual assignment
 */
export async function getSalesRepRecommendations(leadId: string): Promise<SalesRepScore[]> {
  const lead = await getLead(leadId);
  if (!lead) {
    throw new Error('Lead not found');
  }

  // Check if lead has geocoded coordinates
  if (!lead.customer.address.lat || !lead.customer.address.lng) {
    return [];
  }

  // Get active sales reps
  const contractorsQuery = query(
    collection(db, 'contractors'),
    where('status', '==', 'active')
  );
  const contractorsSnapshot = await getDocs(contractorsQuery);

  const salesReps: Contractor[] = contractorsSnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() } as Contractor))
    .filter(c => c.trades.includes('sales_rep'));

  const scores: SalesRepScore[] = [];

  for (const contractor of salesReps) {
    const distance = calculateAddressDistance(contractor.address, lead.customer.address);

    if (distance === null) {
      continue;
    }

    const serviceRadius = contractor.serviceRadius || DEFAULT_SERVICE_RADIUS_MILES;
    const withinRadius = isWithinServiceRadius(distance, serviceRadius);
    const rating = contractor.rating?.overall || 3;

    const distanceScore = Math.max(0, 100 - (distance / (serviceRadius * 2)) * 100);
    const ratingScore = Math.min(100, Math.max(0, rating * 20));
    const combinedScore =
      distanceScore * SALES_REP_WEIGHTS.distance +
      ratingScore * SALES_REP_WEIGHTS.rating;

    scores.push({
      contractorId: contractor.id,
      contractor,
      score: Math.round(combinedScore),
      distance,
      rating,
      isWithinServiceRadius: withinRadius,
    });
  }

  // Sort by score (highest first)
  scores.sort((a, b) => b.score - a.score);

  return scores;
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

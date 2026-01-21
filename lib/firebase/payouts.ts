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
} from 'firebase/firestore';
import { db } from './config';
import {
  Payout,
  PayoutStatus,
  PayoutType,
  PayoutToEntity,
  PayoutFilters,
  PayoutSummary,
} from '@/types/payout';
import { Job } from '@/types/job';
import { Lead } from '@/types/lead';
import { getLead } from './leads';
import {
  generateLaborInvoice,
  generateLeadFeeInvoice,
  generateInvoiceNumber,
} from './invoices';

const COLLECTION = 'payouts';

// Default lead fee percentage (5% of contract value)
const DEFAULT_LEAD_FEE_PERCENTAGE = 0.05;

/**
 * Get all payouts with optional filters
 */
export async function getPayouts(filters?: PayoutFilters): Promise<Payout[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.type) {
    constraints.unshift(where('type', '==', filters.type));
  }

  if (filters?.toEntity) {
    constraints.unshift(where('toEntity', '==', filters.toEntity));
  }

  if (filters?.jobId) {
    constraints.unshift(where('jobId', '==', filters.jobId));
  }

  if (filters?.contractorId) {
    constraints.unshift(where('contractorId', '==', filters.contractorId));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let payouts = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Payout[];

  // Client-side date filters
  if (filters?.startDate) {
    payouts = payouts.filter((p) => {
      const createdAt = p.createdAt as Timestamp;
      return createdAt.toDate() >= filters.startDate!;
    });
  }

  if (filters?.endDate) {
    payouts = payouts.filter((p) => {
      const createdAt = p.createdAt as Timestamp;
      return createdAt.toDate() <= filters.endDate!;
    });
  }

  return payouts;
}

/**
 * Get a single payout by ID
 */
export async function getPayout(id: string): Promise<Payout | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Payout;
  }

  return null;
}

/**
 * Create a payout record
 */
async function createPayout(
  data: Omit<Payout, 'id' | 'createdAt' | 'processedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update payout status
 */
export async function updatePayoutStatus(
  id: string,
  status: PayoutStatus,
  processedBy?: string,
  notes?: string,
  failureReason?: string
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);

  const updates: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };

  if (status === 'completed') {
    updates.processedAt = serverTimestamp();
    if (processedBy) updates.processedBy = processedBy;
    if (notes) updates.notes = notes;
  }

  if (status === 'failed') {
    updates.failedAt = serverTimestamp();
    if (failureReason) updates.failureReason = failureReason;
  }

  await updateDoc(docRef, updates);
}

/**
 * Mark payout as completed (paid)
 */
export async function markPayoutCompleted(
  id: string,
  processedBy: string,
  notes?: string
): Promise<void> {
  await updatePayoutStatus(id, 'completed', processedBy, notes);
}

/**
 * Mark payout as failed
 */
export async function markPayoutFailed(
  id: string,
  failureReason: string
): Promise<void> {
  await updatePayoutStatus(id, 'failed', undefined, undefined, failureReason);
}

/**
 * Generate payouts when a job is marked as paid in full
 *
 * Creates:
 * 1. Lead Fee Payout (KD → KR) - percentage of contract value
 * 2. Labor Payout (KTS → KR) - labor actual cost + commission
 */
export async function generateJobPayouts(
  job: Job,
  leadFeePercentage: number = DEFAULT_LEAD_FEE_PERCENTAGE
): Promise<{ leadFeePayoutId?: string; laborPayoutId?: string }> {
  const result: { leadFeePayoutId?: string; laborPayoutId?: string } = {};

  // Get contract value
  const contractValue = job.commission?.contractValue || 0;
  if (contractValue <= 0) {
    console.warn('Job has no contract value, skipping payout generation');
    return result;
  }

  // 1. Generate Lead Fee Payout (KD → KR)
  if (job.leadId) {
    try {
      const lead = await getLead(job.leadId);
      if (lead) {
        const leadFeeAmount = contractValue * leadFeePercentage;

        // Generate the invoice first
        const leadFeeInvoiceId = await generateLeadFeeInvoice(
          job.leadId,
          lead.source,
          leadFeeAmount
        );

        // Create payout record
        const leadFeePayoutId = await createPayout({
          jobId: job.id,
          jobNumber: job.jobNumber,
          type: 'lead_fee',
          fromEntity: 'kr',
          toEntity: 'kd',
          amount: leadFeeAmount,
          invoiceId: leadFeeInvoiceId,
          status: 'pending',
          leadId: job.leadId,
          leadSource: lead.source,
        });

        result.leadFeePayoutId = leadFeePayoutId;

        // Update job with linked invoice
        const jobRef = doc(db, 'jobs', job.id);
        await updateDoc(jobRef, {
          'linkedInvoices.leadFeeInvoiceId': leadFeeInvoiceId,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Failed to generate lead fee payout:', error);
    }
  }

  // 2. Generate Labor Payout (KTS → KR)
  const laborAmount = job.costs?.laborActual || 0;
  const commissionAmount = job.commission?.amount || 0;
  const totalLaborPayout = laborAmount + commissionAmount;

  if (totalLaborPayout > 0 && job.crewIds && job.crewIds.length > 0) {
    try {
      // Get contractor info (use first crew member for simplicity)
      const contractorId = job.crewIds[0];
      const contractorRef = doc(db, 'contractors', contractorId);
      const contractorSnap = await getDoc(contractorRef);
      const contractorName = contractorSnap.exists()
        ? contractorSnap.data()?.businessName || 'Contractor'
        : 'Contractor';

      // Generate the invoice
      const laborInvoiceId = await generateLaborInvoice(
        job.id,
        job.jobNumber,
        laborAmount,
        commissionAmount,
        contractorName
      );

      // Create payout record
      const laborPayoutId = await createPayout({
        jobId: job.id,
        jobNumber: job.jobNumber,
        type: 'labor',
        fromEntity: 'kr',
        toEntity: 'kts',
        amount: totalLaborPayout,
        invoiceId: laborInvoiceId,
        status: 'pending',
        contractorId,
        contractorName,
      });

      result.laborPayoutId = laborPayoutId;

      // Update job with linked invoice
      const jobRef = doc(db, 'jobs', job.id);
      await updateDoc(jobRef, {
        'linkedInvoices.laborInvoiceId': laborInvoiceId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to generate labor payout:', error);
    }
  }

  return result;
}

/**
 * Get payout summary statistics
 */
export async function getPayoutSummary(): Promise<PayoutSummary> {
  const payouts = await getPayouts();

  const summary: PayoutSummary = {
    totalPending: 0,
    totalProcessing: 0,
    totalCompleted: 0,
    totalFailed: 0,
    pendingAmount: 0,
    completedAmount: 0,
  };

  payouts.forEach((payout) => {
    switch (payout.status) {
      case 'pending':
        summary.totalPending++;
        summary.pendingAmount += payout.amount;
        break;
      case 'processing':
        summary.totalProcessing++;
        summary.pendingAmount += payout.amount;
        break;
      case 'completed':
        summary.totalCompleted++;
        summary.completedAmount += payout.amount;
        break;
      case 'failed':
        summary.totalFailed++;
        break;
    }
  });

  return summary;
}

/**
 * Get payouts for a specific job
 */
export async function getJobPayouts(jobId: string): Promise<Payout[]> {
  const q = query(
    collection(db, COLLECTION),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Payout[];
}

/**
 * Subscribe to payouts for real-time updates
 */
export function subscribeToPayouts(
  callback: (payouts: Payout[]) => void,
  filters?: PayoutFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.type) {
    constraints.unshift(where('type', '==', filters.type));
  }

  if (filters?.toEntity) {
    constraints.unshift(where('toEntity', '==', filters.toEntity));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const payouts = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Payout[];

    callback(payouts);
  });
}

/**
 * Get pending payouts count for dashboard
 */
export async function getPendingPayoutsCount(): Promise<number> {
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.size;
}

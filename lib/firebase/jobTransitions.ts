import { doc, updateDoc, serverTimestamp, Timestamp, addDoc, collection, getDoc } from 'firebase/firestore';
import { db } from './config';
import { Job, JobStatus, JOB_STATUS_ORDER, canTransitionStatus } from '@/types/job';
import { allMaterialsHaveArrivalDates, allMaterialsReady } from './jobMaterials';
import { hasCompletionCertificate } from './completionCert';
import { generateJobPayouts } from './payouts';

export interface TransitionResult {
  success: boolean;
  error?: string;
  payouts?: { leadFeePayoutId?: string; laborPayoutId?: string };
}

export interface TransitionRequirement {
  met: boolean;
  message: string;
}

export interface TransitionValidation {
  canTransition: boolean;
  requirements: TransitionRequirement[];
}

// Role-based transition permissions (partial record - not all statuses can transition to all others)
const TRANSITION_PERMISSIONS: Partial<Record<JobStatus, Partial<Record<JobStatus, string[]>>>> = {
  lead: {
    sold: ['owner', 'admin', 'pm', 'sales_rep'],
  },
  sold: {
    front_end_hold: ['owner', 'admin', 'pm'],
    production: ['owner', 'admin', 'pm'],
    lead: ['owner', 'admin'], // rollback
  },
  front_end_hold: {
    production: ['owner', 'admin', 'pm'],
    sold: ['owner', 'admin'], // rollback
  },
  production: {
    scheduled: ['owner', 'admin', 'pm'],
    front_end_hold: ['owner', 'admin'], // rollback
  },
  scheduled: {
    started: ['owner', 'admin', 'pm'],
    production: ['owner', 'admin'], // rollback
  },
  started: {
    complete: ['owner', 'admin', 'pm'],
    scheduled: ['owner', 'admin'], // rollback
  },
  complete: {
    paid_in_full: ['owner', 'admin', 'pm'],
    started: ['owner', 'admin'], // rollback
  },
  paid_in_full: {
    complete: ['owner', 'admin'], // rollback (payouts may need manual adjustment)
  },
};

export function canUserTransition(
  currentStatus: JobStatus,
  newStatus: JobStatus,
  userRole: string
): boolean {
  const allowedRoles = TRANSITION_PERMISSIONS[currentStatus]?.[newStatus];
  if (!allowedRoles) return false;
  return allowedRoles.includes(userRole);
}

export function getAvailableTransitions(
  currentStatus: JobStatus,
  userRole: string
): JobStatus[] {
  const transitions = TRANSITION_PERMISSIONS[currentStatus];
  if (!transitions) return [];

  return Object.entries(transitions)
    .filter(([, roles]) => roles.includes(userRole))
    .map(([status]) => status as JobStatus);
}

/**
 * Validate if a job meets all requirements for a status transition
 *
 * Requirements by transition:
 * - lead → sold: Contract and down payment documents uploaded
 * - sold → front_end_hold/production: None (review stage)
 * - production → scheduled: All materials have expected/actual arrival dates, crew assigned
 * - scheduled → started: All materials are arrived or collected
 * - started → complete: Completion cert signed, after photos uploaded, final payment recorded
 * - complete → paid_in_full: Final payment verified
 */
export async function validateTransition(
  jobId: string,
  currentStatus: JobStatus,
  newStatus: JobStatus
): Promise<TransitionValidation> {
  const requirements: TransitionRequirement[] = [];

  // Get job data
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    return {
      canTransition: false,
      requirements: [{ met: false, message: 'Job not found' }],
    };
  }

  const job = { id: jobSnap.id, ...jobSnap.data() } as Job;

  // Validate based on transition
  switch (`${currentStatus}->${newStatus}`) {
    case 'lead->sold':
      // Contract and down payment required
      const hasContract = !!job.documents?.contract?.url;
      const hasDownPayment = !!job.documents?.downPayment?.url;
      const hasContractValue = (job.commission?.contractValue || 0) > 0;

      requirements.push({
        met: hasContract,
        message: 'Signed contract must be uploaded',
      });
      requirements.push({
        met: hasDownPayment,
        message: 'Down payment proof must be uploaded',
      });
      requirements.push({
        met: hasContractValue,
        message: 'Contract value must be set',
      });
      break;

    case 'production->scheduled':
      // Materials must have arrival dates, crew assigned
      const materialsHaveArrival = await allMaterialsHaveArrivalDates(jobId);
      const hasCrewAssigned = (job.crewIds?.length || 0) > 0;

      requirements.push({
        met: materialsHaveArrival,
        message: 'All materials must have expected or actual arrival dates',
      });
      requirements.push({
        met: hasCrewAssigned,
        message: 'At least one crew member must be assigned',
      });
      break;

    case 'scheduled->started':
      // All materials must be arrived or collected
      const materialsReady = await allMaterialsReady(jobId);

      requirements.push({
        met: materialsReady,
        message: 'All materials must be arrived or collected',
      });
      break;

    case 'started->complete':
      // Completion cert, after photos, final payment
      const hasCompletionCert = await hasCompletionCertificate(jobId);
      const hasAfterPhotos = (job.photos?.after?.length || 0) > 0;
      const hasFinalPayment = !!job.finalPayment?.amount;

      requirements.push({
        met: hasCompletionCert,
        message: 'Completion certificate must be signed by customer and contractor',
      });
      requirements.push({
        met: hasAfterPhotos,
        message: 'After photos must be uploaded',
      });
      requirements.push({
        met: hasFinalPayment,
        message: 'Final payment must be recorded',
      });
      break;

    case 'complete->paid_in_full':
      // Final payment verified (already recorded in previous step)
      const paymentRecorded = !!job.finalPayment?.amount;

      requirements.push({
        met: paymentRecorded,
        message: 'Final payment must be recorded and verified',
      });
      break;

    // Other transitions have no requirements
    default:
      break;
  }

  return {
    canTransition: requirements.length === 0 || requirements.every((r) => r.met),
    requirements,
  };
}

/**
 * Get unmet requirements for a transition
 */
export async function getUnmetRequirements(
  jobId: string,
  currentStatus: JobStatus,
  newStatus: JobStatus
): Promise<string[]> {
  const validation = await validateTransition(jobId, currentStatus, newStatus);
  return validation.requirements.filter((r) => !r.met).map((r) => r.message);
}

export async function transitionJobStatus(
  jobId: string,
  currentStatus: JobStatus,
  newStatus: JobStatus,
  userId: string,
  userRole: string,
  note?: string,
  skipValidation: boolean = false
): Promise<TransitionResult> {
  // Validate transition is allowed
  if (!canTransitionStatus(currentStatus, newStatus)) {
    return {
      success: false,
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    };
  }

  // Validate user has permission
  if (!canUserTransition(currentStatus, newStatus, userRole)) {
    return {
      success: false,
      error: `You don't have permission to perform this transition`,
    };
  }

  // Validate requirements unless skipped
  if (!skipValidation) {
    const validation = await validateTransition(jobId, currentStatus, newStatus);
    if (!validation.canTransition) {
      const unmetRequirements = validation.requirements
        .filter((r) => !r.met)
        .map((r) => r.message);
      return {
        success: false,
        error: `Requirements not met: ${unmetRequirements.join(', ')}`,
      };
    }
  }

  try {
    const jobRef = doc(db, 'jobs', jobId);
    const now = Timestamp.now();

    // Build update object with status-specific date updates
    const updates: Record<string, unknown> = {
      status: newStatus,
      updatedAt: serverTimestamp(),
    };

    // Set appropriate date based on new status
    switch (newStatus) {
      case 'sold':
        updates['dates.sold'] = now;
        break;
      case 'scheduled':
        updates['dates.scheduledStart'] = now;
        break;
      case 'started':
        updates['dates.actualStart'] = now;
        break;
      case 'complete':
        updates['dates.actualCompletion'] = now;
        // Start warranty on completion
        updates['warranty.startDate'] = now;
        updates['warranty.status'] = 'active';
        // Set warranty end date to 1 year from now
        const warrantyEnd = new Date();
        warrantyEnd.setFullYear(warrantyEnd.getFullYear() + 1);
        updates['warranty.endDate'] = Timestamp.fromDate(warrantyEnd);
        break;
      case 'paid_in_full':
        updates['dates.paidInFull'] = now;
        break;
    }

    await updateDoc(jobRef, updates);

    // Log the transition in communications subcollection
    await addDoc(collection(db, 'jobs', jobId, 'communications'), {
      type: 'status_update',
      userId,
      content: `Status changed from ${currentStatus} to ${newStatus}${note ? `: ${note}` : ''}`,
      attachments: [],
      createdAt: serverTimestamp(),
    });

    // Generate payouts when transitioning to paid_in_full
    let payouts: { leadFeePayoutId?: string; laborPayoutId?: string } | undefined;
    if (newStatus === 'paid_in_full') {
      try {
        // Get the job data for payout generation
        const jobSnap = await getDoc(jobRef);
        if (jobSnap.exists()) {
          const job = { id: jobSnap.id, ...jobSnap.data() } as Job;
          payouts = await generateJobPayouts(job);
        }
      } catch (payoutError) {
        console.error('Failed to generate payouts:', payoutError);
        // Don't fail the transition, just log the error
        // Payouts can be generated manually later
      }
    }

    return { success: true, payouts };
  } catch (error) {
    console.error('Failed to transition job status:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update status',
    };
  }
}

// Get the next logical status in the pipeline
export function getNextPipelineStatus(currentStatus: JobStatus): JobStatus | null {
  const currentIndex = JOB_STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === JOB_STATUS_ORDER.length - 1) {
    return null;
  }
  return JOB_STATUS_ORDER[currentIndex + 1];
}

// Get the previous status in the pipeline (for rollback scenarios)
export function getPreviousStatus(currentStatus: JobStatus): JobStatus | null {
  const currentIndex = JOB_STATUS_ORDER.indexOf(currentStatus);
  if (currentIndex <= 0) {
    return null;
  }
  return JOB_STATUS_ORDER[currentIndex - 1];
}

// Check if a transition is a rollback (moving backward in the pipeline)
export function isRollback(current: JobStatus, next: JobStatus): boolean {
  return JOB_STATUS_ORDER.indexOf(next) < JOB_STATUS_ORDER.indexOf(current);
}

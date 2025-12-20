import { doc, updateDoc, serverTimestamp, Timestamp, addDoc, collection } from 'firebase/firestore';
import { db } from './config';
import { JobStatus, JOB_STATUS_ORDER, canTransitionStatus } from '@/types/job';

export interface TransitionResult {
  success: boolean;
  error?: string;
}

// Role-based transition permissions
const TRANSITION_PERMISSIONS: Record<JobStatus, Record<JobStatus, string[]>> = {
  lead: {
    sold: ['owner', 'admin', 'pm', 'sales_rep'],
  },
  sold: {
    front_end_hold: ['owner', 'admin', 'pm'],
    production: ['owner', 'admin', 'pm'],
  },
  front_end_hold: {
    production: ['owner', 'admin', 'pm'],
  },
  production: {
    scheduled: ['owner', 'admin', 'pm'],
  },
  scheduled: {
    started: ['owner', 'admin', 'pm'],
  },
  started: {
    complete: ['owner', 'admin', 'pm'],
  },
  complete: {
    paid_in_full: ['owner', 'admin', 'pm'],
  },
  paid_in_full: {},
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

export async function transitionJobStatus(
  jobId: string,
  currentStatus: JobStatus,
  newStatus: JobStatus,
  userId: string,
  userRole: string,
  note?: string
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

    return { success: true };
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

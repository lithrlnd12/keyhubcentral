import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

// Full status flow: lead → sold → front_end_hold → production → scheduled → started → complete → paid_in_full
const VALID_STATUSES = [
  'lead',
  'sold',
  'front_end_hold',
  'production',
  'scheduled',
  'started',
  'complete',
  'paid_in_full',
] as const;

type JobStatus = (typeof VALID_STATUSES)[number];

// Contractors can only perform these specific transitions
const CONTRACTOR_ALLOWED_TRANSITIONS: Record<string, string[]> = {
  started: ['complete'],
};

function isValidTransition(
  currentStatus: string,
  newStatus: string,
  isContractor: boolean
): boolean {
  if (!VALID_STATUSES.includes(newStatus as JobStatus)) {
    return false;
  }

  if (isContractor) {
    const allowed = CONTRACTOR_ALLOWED_TRANSITIONS[currentStatus];
    return !!allowed && allowed.includes(newStatus);
  }

  // Non-contractors (admin, PM) can transition more freely
  const currentIdx = VALID_STATUSES.indexOf(currentStatus as JobStatus);
  const newIdx = VALID_STATUSES.indexOf(newStatus as JobStatus);
  return newIdx > currentIdx;
}

async function updateJobStatusHandler(
  params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const jobId = params.jobId as string;
  const newStatus = params.newStatus as string;
  const note = params.note as string | undefined;

  if (!jobId || !newStatus) {
    return { success: false, error: 'jobId and newStatus are required' };
  }

  const db = getAdminDb();

  // Fetch the job
  const jobRef = db.collection('jobs').doc(jobId);
  const jobDoc = await jobRef.get();

  if (!jobDoc.exists) {
    return { success: false, error: 'Job not found' };
  }

  const jobData = jobDoc.data()!;
  const currentStatus = jobData.status as string;

  // Determine if caller is a contractor (based on call context metadata)
  const isContractor =
    (ctx.metadata?.callerType as string) === 'contractor' || true;

  // Validate the transition
  if (!isValidTransition(currentStatus, newStatus, isContractor)) {
    return {
      success: false,
      error: `Cannot transition from '${currentStatus}' to '${newStatus}'${
        isContractor ? ' (contractor permissions)' : ''
      }`,
    };
  }

  // Build the update
  const update: Record<string, unknown> = {
    status: newStatus,
    updatedAt: FieldValue.serverTimestamp(),
    lastStatusChange: FieldValue.serverTimestamp(),
  };

  // Set date fields based on the new status
  if (newStatus === 'complete') {
    update.actualCompletion = FieldValue.serverTimestamp();
  } else if (newStatus === 'started') {
    update.actualStart = FieldValue.serverTimestamp();
  }

  await jobRef.update(update);

  // If a note was provided, add it to communications
  if (note) {
    await jobRef.collection('communications').add({
      type: 'voice_note',
      content: note,
      context: `Status updated from ${currentStatus} to ${newStatus}`,
      createdBy: ctx.metadata?.userId || ctx.callerPhone || ctx.callId,
      createdByName: (ctx.metadata?.callerName as string) || 'Contractor (voice)',
      source: 'voice_call',
      callId: ctx.callId,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return {
    success: true,
    previousStatus: currentStatus,
    newStatus,
  };
}

registerTool({
  name: 'updateJobStatus',
  description:
    'Update the status of a job. Contractors are limited to transitioning from started to complete.',
  parameters: {
    type: 'object',
    properties: {
      jobId: {
        type: 'string',
        description: 'The job document ID',
      },
      newStatus: {
        type: 'string',
        description:
          'The new status to set (e.g., "complete"). Contractors can only set: started→complete.',
      },
      note: {
        type: 'string',
        description: 'Optional note to attach to the status change',
      },
    },
    required: ['jobId', 'newStatus'],
  },
  handler: updateJobStatusHandler,
});

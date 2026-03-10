import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

async function flagScopeChangeHandler(
  params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const jobId = params.jobId as string;
  const description = params.description as string;
  const estimatedImpact = params.estimatedImpact as string | undefined;

  if (!jobId || !description) {
    return { success: false, error: 'jobId and description are required' };
  }

  const db = getAdminDb();

  // Verify the job exists and get PM info
  const jobRef = db.collection('jobs').doc(jobId);
  const jobDoc = await jobRef.get();

  if (!jobDoc.exists) {
    return { success: false, error: 'Job not found' };
  }

  const jobData = jobDoc.data()!;
  const pmId = jobData.pmId || jobData.projectManagerId;
  const jobNumber = jobData.jobNumber || jobId;

  // Create scope change document
  const scopeChangeRef = await jobRef.collection('scopeChanges').add({
    description,
    estimatedImpact: estimatedImpact || null,
    reportedBy: ctx.metadata?.userId || ctx.callerPhone || ctx.callId,
    reportedByName: (ctx.metadata?.callerName as string) || 'Contractor (voice)',
    reportedVia: 'voice' as const,
    status: 'pending' as const,
    callId: ctx.callId,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  // Notify the PM if one is assigned
  if (pmId) {
    await db.collection('notifications').add({
      userId: pmId,
      type: 'scope_change',
      title: 'Scope Change Flagged',
      message: `A scope change has been reported for job ${jobNumber}: ${description}`,
      jobId,
      jobNumber,
      scopeChangeId: scopeChangeRef.id,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return {
    success: true,
    scopeChangeId: scopeChangeRef.id,
  };
}

registerTool({
  name: 'flagScopeChange',
  description:
    'Flag a scope change on a job. Creates a scope change record and notifies the project manager.',
  parameters: {
    type: 'object',
    properties: {
      jobId: {
        type: 'string',
        description: 'The job document ID',
      },
      description: {
        type: 'string',
        description: 'Description of the scope change',
      },
      estimatedImpact: {
        type: 'string',
        description:
          'Optional estimated impact (e.g., "additional 2 hours labor", "$500 materials")',
      },
    },
    required: ['jobId', 'description'],
  },
  handler: flagScopeChangeHandler,
});

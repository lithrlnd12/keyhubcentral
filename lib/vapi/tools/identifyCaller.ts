import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';
import { resolveCallerIdentity } from '@/lib/vapi/callerIdentity';

async function identifyCallerHandler(
  _params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const callerPhone = ctx.callerPhone;

  if (!callerPhone) {
    return { identified: false, reason: 'No caller phone number available' };
  }

  const identity = await resolveCallerIdentity(callerPhone);

  if (identity.type === 'unknown') {
    return { identified: false, reason: 'Caller not found in system' };
  }

  const result: Record<string, unknown> = {
    identified: true,
    callerType: identity.type,
    name: identity.name,
    userId: identity.userId,
  };

  // If contractor, fetch their active jobs
  if (identity.type === 'contractor' && identity.contractorId) {
    const db = getAdminDb();
    const activeStatuses = ['scheduled', 'started', 'production'];

    const jobsSnap = await db
      .collection('jobs')
      .where('crewIds', 'array-contains', identity.contractorId)
      .where('status', 'in', activeStatuses)
      .get();

    const activeJobs = jobsSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        jobId: doc.id,
        jobNumber: data.jobNumber || null,
        type: data.type || null,
        address: data.address || data.jobAddress || null,
        status: data.status,
      };
    });

    result.contractorId = identity.contractorId;
    result.activeJobs = activeJobs;
  }

  return result;
}

registerTool({
  name: 'identifyCaller',
  description:
    'Identify the caller by their phone number. For contractors, also returns their active jobs.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: identifyCallerHandler,
});

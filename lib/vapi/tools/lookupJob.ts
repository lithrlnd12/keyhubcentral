import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

async function lookupJobHandler(
  params: Record<string, unknown>,
  _ctx: CallContext
): Promise<unknown> {
  const searchTerm = params.searchTerm as string;
  const contractorId = params.contractorId as string | undefined;

  if (!searchTerm) {
    return { found: false, error: 'searchTerm is required' };
  }

  const db = getAdminDb();

  // 1. Try exact match by jobNumber first
  let jobsSnap = await db
    .collection('jobs')
    .where('jobNumber', '==', searchTerm)
    .limit(5)
    .get();

  // 2. If no match, try searching by address (case-insensitive via lowercase field)
  if (jobsSnap.empty) {
    const searchLower = searchTerm.toLowerCase();
    jobsSnap = await db
      .collection('jobs')
      .where('addressLower', '>=', searchLower)
      .where('addressLower', '<=', searchLower + '\uf8ff')
      .limit(10)
      .get();
  }

  if (jobsSnap.empty) {
    return { found: false, reason: 'No matching job found' };
  }

  // Filter by contractor if provided
  let docs = jobsSnap.docs;
  if (contractorId) {
    docs = docs.filter((doc) => {
      const crewIds: string[] = doc.data().crewIds || [];
      return crewIds.includes(contractorId);
    });
  }

  if (docs.length === 0) {
    return { found: false, reason: 'No matching job found for this contractor' };
  }

  const doc = docs[0];
  const data = doc.data();

  return {
    found: true,
    jobId: doc.id,
    jobNumber: data.jobNumber || null,
    type: data.type || null,
    status: data.status || null,
    address: data.address || data.jobAddress || null,
    customerName: data.customerName || data.customer?.name || null,
  };
}

registerTool({
  name: 'lookupJob',
  description:
    'Look up a job by job number or address. Optionally filter to jobs assigned to a specific contractor.',
  parameters: {
    type: 'object',
    properties: {
      searchTerm: {
        type: 'string',
        description: 'Job number or address to search for',
      },
      contractorId: {
        type: 'string',
        description: 'Optional contractor ID to filter results to their assigned jobs',
      },
    },
    required: ['searchTerm'],
  },
  handler: lookupJobHandler,
});

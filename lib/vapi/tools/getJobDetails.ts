import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const getJobDetails: ToolDefinition = {
  name: 'getJobDetails',
  description:
    'Retrieve details about a specific job by its ID. ' +
    'Returns job number, type, status, customer info, contract value, sales rep, and address.',
  parameters: {
    jobId: { type: 'string', description: 'The Firestore document ID of the job' },
  },

  async handler(
    params: Record<string, unknown>,
    _ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();
    const jobId = params.jobId as string;

    if (!jobId) {
      return { error: 'jobId is required' };
    }

    const jobDoc = await db.collection('jobs').doc(jobId).get();

    if (!jobDoc.exists) {
      return { error: 'Job not found' };
    }

    const job = jobDoc.data()!;

    // Look up sales rep name if salesRepId is present
    let salesRepName = '';
    if (job.salesRepId) {
      try {
        const userDoc = await db.collection('users').doc(job.salesRepId).get();
        if (userDoc.exists) {
          const userData = userDoc.data()!;
          salesRepName = userData.displayName || userData.name ||
            `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        }
      } catch (err) {
        console.error(`Failed to look up sales rep ${job.salesRepId}:`, err);
      }
    }

    return {
      jobNumber: job.jobNumber || jobDoc.id,
      type: job.type || job.trade || '',
      status: job.status || '',
      customerName: job.customer?.name || '',
      customerPhone: job.customer?.phone || '',
      contractValue: job.commission?.contractValue || 0,
      salesRepName,
      address: job.customer?.address || job.address || {},
    };
  },
};

registerTool(getJobDetails);

export default getJobDetails;

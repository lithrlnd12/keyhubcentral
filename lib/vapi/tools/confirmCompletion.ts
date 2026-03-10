import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const confirmCompletion: ToolDefinition = {
  name: 'confirmCompletion',
  description:
    'Confirm that a job has been completed to the customer\'s satisfaction. ' +
    'Use this when the customer confirms the work is done and they have no issues.',
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

    const jobRef = db.collection('jobs').doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return { error: 'Job not found' };
    }

    await jobRef.update({
      customerVerified: true,
      customerVerifiedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  },
};

registerTool(confirmCompletion);

export default confirmCompletion;

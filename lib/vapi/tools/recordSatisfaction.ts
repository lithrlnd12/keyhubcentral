import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const recordSatisfaction: ToolDefinition = {
  name: 'recordSatisfaction',
  description:
    'Record a customer satisfaction rating and optional feedback for a completed job. ' +
    'Use this after asking the customer how satisfied they are with the work.',
  parameters: {
    jobId: { type: 'string', description: 'The Firestore document ID of the job' },
    rating: { type: 'number', description: 'Customer satisfaction rating from 1 to 5' },
    feedback: { type: 'string', description: 'Optional customer feedback or comments' },
  },

  async handler(
    params: Record<string, unknown>,
    _ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();
    const jobId = params.jobId as string;
    const rating = params.rating as number;
    const feedback = (params.feedback as string | undefined) || '';

    if (!jobId) {
      return { error: 'jobId is required' };
    }

    if (!rating || rating < 1 || rating > 5) {
      return { error: 'rating must be a number between 1 and 5' };
    }

    const jobRef = db.collection('jobs').doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return { error: 'Job not found' };
    }

    await jobRef.update({
      customerRating: rating,
      customerFeedback: feedback,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  },
};

registerTool(recordSatisfaction);

export default recordSatisfaction;

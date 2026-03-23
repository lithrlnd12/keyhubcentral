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

    const jobData = jobDoc.data()!;
    const pmReviewRequired = rating <= 3;

    // Update job with rating
    await jobRef.update({
      customerRating: rating,
      customerFeedback: feedback,
      pmReviewRequired,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Write to ratingRequests collection for PM review queue
    await db.collection('ratingRequests').add({
      jobId,
      customerId: jobData.customerId || null,
      customerName: jobData.customer?.name || jobData.customer?.firstName || null,
      contractorId: jobData.contractorId || null,
      rating,
      feedback,
      pmReviewRequired,
      source: 'ai_voice_call',
      reviewedByPm: false,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Response tells the assistant what to say next
    if (pmReviewRequired) {
      return {
        success: true,
        action: 'pm_review',
        message: 'Rating recorded. A project manager will follow up.',
      };
    }

    return {
      success: true,
      action: 'request_review',
      message: 'Rating recorded. Customer is happy — prompt for Google review.',
    };
  },
};

registerTool(recordSatisfaction);

export default recordSatisfaction;

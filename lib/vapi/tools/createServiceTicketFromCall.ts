import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const createServiceTicketFromCall: ToolDefinition = {
  name: 'createServiceTicketFromCall',
  description:
    'Create a service ticket when a customer reports an issue during a completion verification call. ' +
    'This also marks the job as not verified by the customer.',
  parameters: {
    jobId: { type: 'string', description: 'The Firestore document ID of the job' },
    issue: { type: 'string', description: 'Description of the issue reported by the customer' },
    urgency: {
      type: 'string',
      description: 'Urgency level of the issue: low, medium, high, or emergency',
    },
  },

  async handler(
    params: Record<string, unknown>,
    ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();
    const jobId = params.jobId as string;
    const issue = params.issue as string;
    const urgency = (params.urgency as string) || 'medium';

    if (!jobId) {
      return { error: 'jobId is required' };
    }

    if (!issue) {
      return { error: 'issue description is required' };
    }

    if (!['low', 'medium', 'high', 'emergency'].includes(urgency)) {
      return { error: 'urgency must be one of: low, medium, high, emergency' };
    }

    const jobRef = db.collection('jobs').doc(jobId);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return { error: 'Job not found' };
    }

    const job = jobDoc.data()!;

    // Create service ticket
    const ticketData = {
      jobId,
      issueDescription: issue,
      urgency,
      status: 'open',
      customer: {
        name: job.customer?.name || '',
        phone: job.customer?.phone || '',
        email: job.customer?.email || '',
      },
      vapiCallId: ctx.callId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ticketRef = await db.collection('serviceTickets').add(ticketData);

    // Mark job as not customer-verified
    await jobRef.update({
      customerVerified: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, ticketId: ticketRef.id };
  },
};

registerTool(createServiceTicketFromCall);

export default createServiceTicketFromCall;

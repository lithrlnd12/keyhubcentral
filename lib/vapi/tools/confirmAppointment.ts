import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const confirmAppointment: ToolDefinition = {
  name: 'confirmAppointment',
  description:
    'Record the customer response to an appointment reminder call. ' +
    'Call this with the customer\'s response after asking if they can confirm their scheduled appointment.',
  parameters: {
    jobId: { type: 'string', description: 'The Firestore document ID of the job' },
    response: {
      type: 'string',
      enum: ['confirmed', 'reschedule', 'cancelled'],
      description: 'Customer response: confirmed, reschedule, or cancelled',
    },
  },

  async handler(
    params: Record<string, unknown>,
    _ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();
    const jobId = params.jobId as string;
    const response = params.response as 'confirmed' | 'reschedule' | 'cancelled';

    if (!jobId) return { error: 'jobId is required' };
    if (!['confirmed', 'reschedule', 'cancelled'].includes(response)) {
      return { error: 'response must be confirmed, reschedule, or cancelled' };
    }

    const jobRef = db.collection('jobs').doc(jobId);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) return { error: 'Job not found' };

    const update: Record<string, unknown> = {
      appointmentConfirmationResponse: response,
      appointmentConfirmedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Flag reschedule/cancellations for PM action
    if (response === 'reschedule' || response === 'cancelled') {
      update['pmActionRequired'] = true;
      update['pmActionType'] = response === 'reschedule' ? 'reschedule_requested' : 'cancellation_requested';
    }

    await jobRef.update(update);

    if (response === 'confirmed') {
      return { success: true, message: 'Appointment confirmed. Crew will be on site as scheduled.' };
    }
    if (response === 'reschedule') {
      return { success: true, message: 'Reschedule noted. A team member will call to find a new time.' };
    }
    return { success: true, message: 'Cancellation noted. Customer can reach us to rebook.' };
  },
};

registerTool(confirmAppointment);

export default confirmAppointment;

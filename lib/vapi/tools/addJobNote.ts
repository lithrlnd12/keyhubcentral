import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

async function addJobNoteHandler(
  params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const jobId = params.jobId as string;
  const note = params.note as string;

  if (!jobId || !note) {
    return { success: false, error: 'jobId and note are required' };
  }

  const db = getAdminDb();

  // Verify the job exists
  const jobRef = db.collection('jobs').doc(jobId);
  const jobDoc = await jobRef.get();

  if (!jobDoc.exists) {
    return { success: false, error: 'Job not found' };
  }

  // Add the voice note to the communications subcollection
  const commRef = await jobRef.collection('communications').add({
    type: 'voice_note',
    content: note,
    createdBy: ctx.metadata?.userId || ctx.callerPhone || ctx.callId,
    createdByName: (ctx.metadata?.callerName as string) || 'Contractor (voice)',
    source: 'voice_call',
    callId: ctx.callId,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    success: true,
    noteId: commRef.id,
  };
}

registerTool({
  name: 'addJobNote',
  description:
    'Add a voice note to a job. The note is saved to the job communications subcollection.',
  parameters: {
    type: 'object',
    properties: {
      jobId: {
        type: 'string',
        description: 'The job document ID',
      },
      note: {
        type: 'string',
        description: 'The note content to add to the job',
      },
    },
    required: ['jobId', 'note'],
  },
  handler: addJobNoteHandler,
});

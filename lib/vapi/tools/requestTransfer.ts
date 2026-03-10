import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const requestTransfer: ToolDefinition = {
  name: 'requestTransfer',
  description:
    'Initiate a warm transfer to a sales rep. Creates a pending transfer record ' +
    'and updates the lead assignment. The telephony layer reads the pending transfer ' +
    'to dial the rep with a whisper message.',
  parameters: {
    repUserId: {
      type: 'string',
      description: 'The userId of the sales rep to transfer to',
    },
    leadId: {
      type: 'string',
      description: 'The lead ID associated with this call',
    },
    summary: {
      type: 'string',
      description:
        'Brief summary of the caller situation to whisper to the rep before connecting',
    },
  },

  async handler(
    params: Record<string, unknown>,
    ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();

    const repUserId = params.repUserId as string;
    const leadId = params.leadId as string;
    const summary = params.summary as string;

    // Look up contractor record to get phone number and name
    const contractorSnap = await db
      .collection('contractors')
      .where('userId', '==', repUserId)
      .limit(1)
      .get();

    if (contractorSnap.empty) {
      return {
        success: false,
        error: 'Sales rep contractor record not found',
      };
    }

    const contractorDoc = contractorSnap.docs[0];
    const contractorData = contractorDoc.data();
    const repPhone = contractorData.phone as string | undefined;
    const repName =
      (contractorData.businessName as string) ||
      (contractorData.displayName as string) ||
      'Sales Rep';

    if (!repPhone) {
      return {
        success: false,
        error: 'Sales rep does not have a phone number on file',
      };
    }

    // Build whisper message for the rep
    const whisperMessage = `Incoming warm transfer. ${summary}`;

    // Write pending transfer document keyed by callId
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    await db
      .collection('pendingTransfers')
      .doc(ctx.callId)
      .set({
        repPhone,
        repName,
        repUserId,
        leadId,
        whisperMessage,
        callId: ctx.callId,
        expiresAt,
        createdAt: FieldValue.serverTimestamp(),
      });

    // Update the lead with the assigned sales rep
    await db.collection('leads').doc(leadId).update({
      assignedTo: repUserId,
      assignedType: 'internal',
      status: 'assigned',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      transferInitiated: true,
    };
  },
};

registerTool(requestTransfer);

export default requestTransfer;

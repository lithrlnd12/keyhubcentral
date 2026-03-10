import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const sendUploadLink: ToolDefinition = {
  name: 'sendUploadLink',
  description:
    'Send an SMS to a contractor with a deep link to upload a required document. ' +
    'Use this when a contractor agrees to upload their document during a compliance call.',
  parameters: {
    contractorId: { type: 'string', description: 'The Firestore document ID of the contractor' },
    docType: {
      type: 'string',
      description: 'Type of document to upload: insurance, license, or w9',
    },
  },

  async handler(
    params: Record<string, unknown>,
    _ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();
    const contractorId = params.contractorId as string;
    const docType = params.docType as string;

    if (!contractorId) {
      return { error: 'contractorId is required' };
    }

    if (!['insurance', 'license', 'w9'].includes(docType)) {
      return { error: 'docType must be one of: insurance, license, w9' };
    }

    const contractorDoc = await db.collection('contractors').doc(contractorId).get();

    if (!contractorDoc.exists) {
      return { error: 'Contractor not found' };
    }

    const contractor = contractorDoc.data()!;
    const phone = contractor.phone || contractor.contactPhone;

    if (!phone) {
      return { error: 'Contractor has no phone number on file' };
    }

    // Build deep link to portal upload page
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://keyhubcentral.com';
    const uploadLink = `${baseUrl}/portal/documents?upload=${docType}`;

    const docTypeLabels: Record<string, string> = {
      insurance: 'insurance certificate',
      license: 'license',
      w9: 'W-9 form',
    };

    const message =
      `KeyHub Central: Please upload your ${docTypeLabels[docType]} using this link: ${uploadLink}`;

    // Create a scheduledSMS doc for the SMS cron to pick up
    await db.collection('scheduledSMS').add({
      to: phone,
      body: message,
      status: 'pending',
      contractorId,
      docType,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, message: 'Upload link sent via SMS' };
  },
};

registerTool(sendUploadLink);

export default sendUploadLink;

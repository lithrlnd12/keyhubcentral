import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const checkDocumentStatus: ToolDefinition = {
  name: 'checkDocumentStatus',
  description:
    'Check whether a contractor has uploaded a required document and when it expires. ' +
    'Use this to verify compliance status for insurance, license, or W-9 documents.',
  parameters: {
    contractorId: { type: 'string', description: 'The Firestore document ID of the contractor' },
    docType: {
      type: 'string',
      description: 'Type of document to check: insurance, license, or w9',
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
    const documents = contractor.documents || {};
    const doc = documents[docType];

    if (!doc || !doc.uploadedAt) {
      return {
        uploaded: false,
        expirationDate: null,
        daysUntilExpiry: null,
      };
    }

    // Calculate days until expiry if expiration date exists
    let expirationDate: string | null = null;
    let daysUntilExpiry: number | null = null;

    if (doc.expirationDate) {
      const expDate = doc.expirationDate.toDate
        ? doc.expirationDate.toDate()
        : new Date(doc.expirationDate);
      expirationDate = expDate.toISOString().split('T')[0];
      const now = new Date();
      daysUntilExpiry = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return {
      uploaded: true,
      expirationDate,
      daysUntilExpiry,
    };
  },
};

registerTool(checkDocumentStatus);

export default checkDocumentStatus;

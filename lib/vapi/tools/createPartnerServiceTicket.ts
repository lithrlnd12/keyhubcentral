import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const VALID_URGENCIES = ['low', 'medium', 'high', 'emergency'] as const;

const createPartnerServiceTicket: ToolDefinition = {
  name: 'createPartnerServiceTicket',
  description:
    'Create a service ticket on behalf of a partner. Requires the partner ID (from lookupPartnerInfo), ' +
    'property address, issue type, description, and urgency level.',
  parameters: {
    partnerId: { type: 'string', description: 'ID of the partner (from lookupPartnerInfo)' },
    propertyAddress: { type: 'string', description: 'Address of the property with the issue' },
    issueType: {
      type: 'string',
      description: 'Type of issue (e.g. plumbing, electrical, roofing, HVAC, general)',
    },
    description: { type: 'string', description: 'Detailed description of the issue' },
    urgency: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'emergency'],
      description: 'Urgency level: low, medium, high, or emergency',
    },
  },

  async handler(
    params: Record<string, unknown>,
    ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();

    const partnerId = params.partnerId as string;
    const propertyAddress = params.propertyAddress as string;
    const issueType = params.issueType as string;
    const description = params.description as string;
    const rawUrgency = (params.urgency as string).toLowerCase();

    // Validate urgency
    const urgency = VALID_URGENCIES.includes(rawUrgency as typeof VALID_URGENCIES[number])
      ? rawUrgency
      : 'medium';

    // Look up partner info for denormalized fields
    const partnerDoc = await db.collection('partners').doc(partnerId).get();
    if (!partnerDoc.exists) {
      return { success: false, error: 'Partner not found' };
    }

    const partnerData = partnerDoc.data()!;

    const ticketData = {
      partnerId,
      partnerCompany: partnerData.companyName || '',
      propertyAddress,
      issueType,
      issueDescription: description,
      urgency,
      status: 'open',
      source: 'phone',
      vapiCallId: ctx.callId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const ticketRef = await db.collection('partnerTickets').add(ticketData);

    return { success: true, ticketId: ticketRef.id };
  },
};

registerTool(createPartnerServiceTicket);

export default createPartnerServiceTicket;

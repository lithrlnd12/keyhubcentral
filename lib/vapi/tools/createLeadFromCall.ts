import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const createLeadFromCall: ToolDefinition = {
  name: 'createLeadFromCall',
  description:
    'Create a new lead in the system from information gathered during a phone call. ' +
    'Use this when a caller expresses interest in a project or service.',
  parameters: {
    callerName: { type: 'string', description: 'Full name of the caller' },
    phone: { type: 'string', description: 'Phone number of the caller' },
    projectType: {
      type: 'string',
      description: 'Type of project the caller is interested in (e.g. roofing, siding, windows)',
    },
    urgency: {
      type: 'string',
      description: 'How urgent the project is: low, medium, or high',
    },
    city: { type: 'string', description: 'City where the project is located' },
    zip: { type: 'string', description: 'ZIP code where the project is located' },
    notes: { type: 'string', description: 'Additional notes or details from the call' },
  },

  async handler(
    params: Record<string, unknown>,
    ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();

    const callerName = params.callerName as string;
    const phone = (params.phone as string) || ctx.callerPhone || '';
    const projectType = params.projectType as string;
    const urgency = (params.urgency as string | undefined) || 'medium';
    const city = (params.city as string | undefined) || '';
    const zip = (params.zip as string | undefined) || '';
    const notes = (params.notes as string | undefined) || '';

    // Map urgency to lead quality
    let quality: 'hot' | 'warm' | 'cold';
    switch (urgency.toLowerCase()) {
      case 'high':
        quality = 'hot';
        break;
      case 'low':
        quality = 'cold';
        break;
      default:
        quality = 'warm';
        break;
    }

    const leadData = {
      customer: {
        name: callerName,
        phone,
        email: '',
        address: {
          street: '',
          city,
          state: '',
          zip,
        },
      },
      status: 'new',
      source: 'other',
      trade: projectType,
      quality,
      notes,
      vapiCallId: ctx.callId,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('leads').add(leadData);

    return { success: true, leadId: docRef.id };
  },
};

registerTool(createLeadFromCall);

export default createLeadFromCall;

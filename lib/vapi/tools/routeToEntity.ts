import { FieldValue } from 'firebase-admin/firestore';
import { getAdminDb } from '@/lib/firebase/admin';
import { registerTool, ToolDefinition, CallContext } from '@/lib/vapi/toolRegistry';

const routeToEntity: ToolDefinition = {
  name: 'routeToEntity',
  description:
    'Route an inbound caller to the appropriate business entity (KR, KTS, or KD) and create ' +
    'the corresponding record. Use this after determining which entity the caller needs.',
  parameters: {
    entity: {
      type: 'string',
      enum: ['kr', 'kts', 'kd'],
      description: 'Business entity to route to: kr (renovations), kts (contractor network), kd (marketing/leads)',
    },
    callerName: { type: 'string', description: 'Full name of the caller' },
    phone: { type: 'string', description: 'Phone number of the caller' },
    details: { type: 'string', description: 'Summary of what the caller needs' },
    projectType: {
      type: 'string',
      description: 'Type of project or trade (e.g. roofing, siding, windows). Optional.',
    },
    urgency: {
      type: 'string',
      description: 'Urgency level: low, medium, or high. Optional.',
    },
  },

  async handler(
    params: Record<string, unknown>,
    ctx: CallContext
  ): Promise<unknown> {
    const db = getAdminDb();

    const entity = (params.entity as string).toLowerCase();
    const callerName = params.callerName as string;
    const phone = (params.phone as string) || ctx.callerPhone || '';
    const details = params.details as string;
    const projectType = (params.projectType as string | undefined) || '';
    const urgency = (params.urgency as string | undefined) || 'medium';

    switch (entity) {
      // Key Renovations — create a lead
      case 'kr': {
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
            address: '',
          },
          status: 'new',
          source: 'phone',
          trade: projectType || 'general',
          quality,
          notes: details,
          entity: 'kr',
          vapiCallId: ctx.callId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        const leadRef = await db.collection('leads').add(leadData);
        return {
          success: true,
          entity: 'kr',
          recordId: leadRef.id,
          recordType: 'lead',
        };
      }

      // Key Trade Solutions — create a service ticket
      case 'kts': {
        const ticketData = {
          callerName,
          callerPhone: phone,
          description: details,
          trade: projectType || '',
          urgency: urgency.toLowerCase(),
          status: 'open',
          source: 'phone',
          entity: 'kts',
          vapiCallId: ctx.callId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        const ticketRef = await db.collection('serviceTickets').add(ticketData);
        return {
          success: true,
          entity: 'kts',
          recordId: ticketRef.id,
          recordType: 'serviceTicket',
        };
      }

      // Keynote Digital — create a marketing prospect/lead
      case 'kd': {
        const prospectData = {
          customer: {
            name: callerName,
            phone,
            email: '',
            address: '',
          },
          status: 'new',
          source: 'phone',
          trade: projectType || '',
          quality: 'warm' as const,
          notes: details,
          tags: ['marketing-inquiry'],
          entity: 'kd',
          vapiCallId: ctx.callId,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        const prospectRef = await db.collection('leads').add(prospectData);
        return {
          success: true,
          entity: 'kd',
          recordId: prospectRef.id,
          recordType: 'prospect',
        };
      }

      default:
        return {
          success: false,
          error: `Unknown entity: ${entity}. Must be kr, kts, or kd.`,
        };
    }
  },
};

registerTool(routeToEntity);

export default routeToEntity;

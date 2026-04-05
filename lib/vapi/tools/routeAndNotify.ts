import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendSms } from '@/lib/sms/provider';
import { tenant } from '@/lib/config/tenant';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

async function routeAndNotifyHandler(
  params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const customerName = params.customerName as string;
  const customerPhone = params.customerPhone as string;
  const projectType = params.projectType as string | undefined;
  const city = params.city as string | undefined;
  const description = params.description as string | undefined;
  const teamMemberId = params.teamMemberId as string;

  if (!customerName || !customerPhone || !teamMemberId) {
    return { success: false, error: 'Customer name, phone, and team member ID are required.' };
  }

  const db = getAdminDb();

  try {
    // Step 1: Look up the contractor
    const contractorDoc = await db.collection('contractors').doc(teamMemberId).get();

    if (!contractorDoc.exists) {
      return { success: false, error: 'Team member not found. Please try again.' };
    }

    const contractor = contractorDoc.data()!;
    const contractorName =
      (contractor.businessName as string) || (contractor.displayName as string) || 'Team Member';
    const contractorPhone = contractor.phone as string;
    const contractorUserId = contractor.userId as string;

    // Step 2: Send SMS notification to the team member
    if (contractorPhone) {
      const projectLine = projectType ? `Project: ${projectType}\n` : '';
      const locationLine = city ? `Location: ${city}\n` : '';
      const detailsLine = description ? `Details: ${description}\n` : '';

      const message =
        `\uD83D\uDD14 ${tenant.appName} - New Lead!\n` +
        `${customerName} - ${customerPhone}\n` +
        `${projectLine}${locationLine}${detailsLine}\n` +
        `Please call them within 15 minutes.`;

      const smsResult = await sendSms(contractorPhone, message);
      if (!smsResult.success) {
        console.error(`Failed to send SMS to contractor ${teamMemberId}:`, smsResult.error);
      }
    }

    // Step 3: Save to inboundCalls with status 'routed'
    await db.collection('inboundCalls').add({
      customerName,
      customerPhone,
      projectType: projectType || null,
      city: city || null,
      description: description || null,
      status: 'routed',
      routedTo: teamMemberId,
      routedToName: contractorName,
      source: 'voice_call',
      vapiCallId: ctx.callId || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Step 4: Create a notification in the notifications collection
    if (contractorUserId) {
      try {
        await db.collection('notifications').add({
          userId: contractorUserId,
          type: 'new_lead',
          title: 'New Lead Assigned',
          body: `${customerName} needs help${projectType ? ` with ${projectType}` : ''}. Please call ${customerPhone} within 15 minutes.`,
          read: false,
          data: {
            customerName,
            customerPhone,
            projectType: projectType || '',
            city: city || '',
          },
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch (err) {
        console.error('Error creating notification:', err);
        // Don't fail the route over a notification error
      }
    }

    // Step 5: Return success
    return {
      success: true,
      teamMemberName: contractorName,
      estimatedCallbackMinutes: 15,
    };
  } catch (err) {
    console.error('Error routing call:', err);
    return {
      success: false,
      error: 'We were unable to route your call. Please try again or call back later.',
    };
  }
}

registerTool({
  name: 'routeAndNotify',
  description:
    'Route an inbound call to a specific team member by sending them an SMS with full context ' +
    'and saving the lead to the inbound calls log. Use after checkTeamAvailability identifies a team member.',
  parameters: {
    type: 'object',
    properties: {
      customerName: {
        type: 'string',
        description: 'Name of the customer',
      },
      customerPhone: {
        type: 'string',
        description: 'Phone number of the customer',
      },
      projectType: {
        type: 'string',
        description: 'Type of project or service needed',
      },
      city: {
        type: 'string',
        description: 'City or location of the customer',
      },
      description: {
        type: 'string',
        description: 'Brief description of what the customer needs',
      },
      teamMemberId: {
        type: 'string',
        description: 'Contractor ID of the team member to route to',
      },
    },
    required: ['customerName', 'customerPhone', 'teamMemberId'],
  },
  handler: routeAndNotifyHandler,
});

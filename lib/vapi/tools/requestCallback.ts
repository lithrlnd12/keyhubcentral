import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { sendSms } from '@/lib/sms/provider';
import { tenant } from '@/lib/config/tenant';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

async function requestCallbackHandler(
  params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const customerName = params.customerName as string;
  const customerPhone = params.customerPhone as string;
  const projectType = params.projectType as string | undefined;
  const description = params.description as string | undefined;
  const preferredTime = params.preferredTime as string | undefined;
  const teamMemberId = params.teamMemberId as string | undefined;

  if (!customerName || !customerPhone) {
    return { success: false, error: 'Customer name and phone number are required.' };
  }

  const db = getAdminDb();

  try {
    // Save callback request to inboundCalls collection
    const callbackData: Record<string, unknown> = {
      customerName,
      customerPhone,
      projectType: projectType || null,
      description: description || null,
      preferredTime: preferredTime || null,
      status: 'callback_requested',
      source: 'voice_call',
      vapiCallId: ctx.callId || null,
      teamMemberId: teamMemberId || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('inboundCalls').add(callbackData);

    let teamMemberName = 'A team member';
    let estimatedMinutes = 30;

    // If a specific team member was identified, notify them via SMS
    if (teamMemberId) {
      try {
        const contractorDoc = await db.collection('contractors').doc(teamMemberId).get();

        if (contractorDoc.exists) {
          const contractor = contractorDoc.data()!;
          teamMemberName = (contractor.businessName as string) || (contractor.displayName as string) || 'A team member';
          const contractorPhone = contractor.phone as string;
          estimatedMinutes = 15;

          if (contractorPhone) {
            const projectInfo = projectType ? ` needs help with ${projectType}.` : '.';
            const descInfo = description ? ` ${description}.` : '';
            const message =
              `${tenant.appName} - Callback Request: ${customerName} at ${customerPhone}${projectInfo}${descInfo} Please call back ASAP.`;

            const smsResult = await sendSms(contractorPhone, message);
            if (!smsResult.success) {
              console.error(`Failed to send SMS to contractor ${teamMemberId}:`, smsResult.error);
            }
          }
        }
      } catch (err) {
        console.error('Error notifying team member:', err);
        // Don't fail the callback request over a notification error
      }
    }

    return {
      success: true,
      message: `Callback request saved. ${teamMemberName} will call you back within ${estimatedMinutes} minutes.`,
    };
  } catch (err) {
    console.error('Error saving callback request:', err);
    return {
      success: false,
      error: 'We were unable to save your callback request. Please try again or call back later.',
    };
  }
}

registerTool({
  name: 'requestCallback',
  description:
    'Save a callback request for a customer and notify the assigned team member via SMS. ' +
    'Use this when no one is available for an immediate transfer.',
  parameters: {
    type: 'object',
    properties: {
      customerName: {
        type: 'string',
        description: 'Name of the customer requesting a callback',
      },
      customerPhone: {
        type: 'string',
        description: 'Phone number of the customer',
      },
      projectType: {
        type: 'string',
        description: 'Type of project or service needed',
      },
      description: {
        type: 'string',
        description: 'Brief description of what the customer needs help with',
      },
      preferredTime: {
        type: 'string',
        description: 'When the customer prefers to be called back (e.g. "this afternoon", "tomorrow morning")',
      },
      teamMemberId: {
        type: 'string',
        description: 'Optional contractor/team member ID to assign the callback to',
      },
    },
    required: ['customerName', 'customerPhone'],
  },
  handler: requestCallbackHandler,
});

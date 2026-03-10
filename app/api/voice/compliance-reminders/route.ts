import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { createOutboundCallWithAssistant } from '@/lib/vapi/assistants';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const CRON_SECRET = process.env.CRON_SECRET;
const VAPI_ASSISTANT_ID = process.env.VAPI_ASSISTANT_ID;
const VAPI_PHONE_NUMBER_ID = process.env.VAPI_PHONE_NUMBER_ID;

export async function GET(request: NextRequest) {
  try {
    // Fail-closed: require CRON_SECRET to be configured
    if (!CRON_SECRET) {
      console.error('CRON_SECRET not configured - rejecting request');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!VAPI_ASSISTANT_ID || !VAPI_PHONE_NUMBER_ID) {
      return NextResponse.json(
        { error: 'VAPI_ASSISTANT_ID or VAPI_PHONE_NUMBER_ID not configured' },
        { status: 500 }
      );
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    // Find pending compliance reminder calls
    const callsSnapshot = await db
      .collection('scheduledVoiceCalls')
      .where('type', '==', 'compliance_reminder')
      .where('scheduledFor', '<=', now)
      .where('status', '==', 'pending')
      .limit(5)
      .get();

    const results: Array<{ callDocId: string; contractorId: string; success: boolean; error?: string }> = [];

    for (const doc of callsSnapshot.docs) {
      const scheduledCall = doc.data();
      const contractorId = scheduledCall.contractorId;

      try {
        // Look up contractor details
        const contractorDoc = await db.collection('contractors').doc(contractorId).get();

        if (!contractorDoc.exists) {
          await doc.ref.update({ status: 'failed', error: 'Contractor not found', updatedAt: FieldValue.serverTimestamp() });
          results.push({ callDocId: doc.id, contractorId, success: false, error: 'Contractor not found' });
          continue;
        }

        const contractor = contractorDoc.data()!;
        const phone = contractor.phone || contractor.contactPhone;

        if (!phone) {
          await doc.ref.update({ status: 'failed', error: 'No phone number', updatedAt: FieldValue.serverTimestamp() });
          results.push({ callDocId: doc.id, contractorId, success: false, error: 'No phone number' });
          continue;
        }

        const contractorName = contractor.name || contractor.displayName ||
          `${contractor.firstName || ''} ${contractor.lastName || ''}`.trim() || 'there';
        const docTypes = scheduledCall.docTypes || [];
        const docTypeLabels: Record<string, string> = {
          insurance: 'insurance certificate',
          license: 'license',
          w9: 'W-9 form',
        };
        const docList = docTypes.map((dt: string) => docTypeLabels[dt] || dt).join(', ');

        // Create outbound call with compliance context
        const call = await createOutboundCallWithAssistant({
          assistantId: VAPI_ASSISTANT_ID,
          phoneNumberId: VAPI_PHONE_NUMBER_ID,
          customerNumber: phone,
          customerName: contractorName,
          assistantOverrides: {
            model: {
              messages: [
                {
                  role: 'system',
                  content:
                    `You are Riley, an administrative coordinator from KeyHub Central. ` +
                    `You are calling ${contractorName} about compliance documents that need attention. ` +
                    `Contractor ID: ${contractorId}. ` +
                    `Documents needing attention: ${docList || 'various compliance documents'}. ` +
                    `Your goals are: 1) Inform them about expiring or missing documents, ` +
                    `2) Use checkDocumentStatus to verify current status, ` +
                    `3) Offer to send an upload link via sendUploadLink if they are ready to submit, ` +
                    `4) Be professional and helpful, not threatening. ` +
                    `Remind them that keeping documents current is required to remain active in the network.`,
                },
              ],
            },
          },
          metadata: {
            contractorId,
            callType: 'compliance_reminder',
            scheduledCallId: doc.id,
          },
        });

        // Update scheduled call record
        await doc.ref.update({
          status: 'completed',
          vapiCallId: call.id,
          calledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Store call record
        await db.collection('voiceCalls').add({
          contractorId,
          vapiCallId: call.id,
          phoneNumber: phone,
          contractorName,
          callType: 'compliance_reminder',
          scheduledCallId: doc.id,
          status: 'initiated',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        results.push({ callDocId: doc.id, contractorId, success: true });
        console.log(`Compliance reminder call initiated for contractor ${contractorId}, call ID: ${call.id}`);
      } catch (error) {
        console.error(`Failed to call contractor ${contractorId}:`, error);

        await doc.ref.update({
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: FieldValue.serverTimestamp(),
        });

        results.push({
          callDocId: doc.id,
          contractorId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Error processing compliance reminder calls:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process calls' },
      { status: 500 }
    );
  }
}

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

    // Find completed jobs that need verification calls
    const jobsSnapshot = await db
      .collection('jobs')
      .where('verificationCallScheduledAt', '<=', now)
      .where('status', '==', 'complete')
      .limit(5)
      .get();

    const results: Array<{ jobId: string; success: boolean; error?: string }> = [];

    for (const doc of jobsSnapshot.docs) {
      const job = doc.data();

      // Skip if already has a verification call
      if (job.verificationCallId) {
        continue;
      }

      // Skip if no customer phone
      if (!job.customer?.phone) {
        results.push({ jobId: doc.id, success: false, error: 'No customer phone number' });
        continue;
      }

      try {
        const customerName = job.customer.name || 'there';
        const jobType = job.type || job.trade || 'project';

        // Create outbound call with assistant overrides for verification context
        const call = await createOutboundCallWithAssistant({
          assistantId: VAPI_ASSISTANT_ID,
          phoneNumberId: VAPI_PHONE_NUMBER_ID,
          customerNumber: job.customer.phone,
          customerName,
          assistantOverrides: {
            model: {
              messages: [
                {
                  role: 'system',
                  content:
                    `You are Riley, a quality assurance specialist from KeyHub Central. ` +
                    `You are calling ${customerName} to verify the completion of their ${jobType} project. ` +
                    `Job ID: ${doc.id}. ` +
                    `Your goals are: 1) Confirm the work was completed satisfactorily, ` +
                    `2) Ask for a satisfaction rating (1-5), 3) Collect any feedback, ` +
                    `4) If there are issues, create a service ticket. ` +
                    `Use the confirmCompletion tool if everything is good, ` +
                    `recordSatisfaction to save their rating, ` +
                    `or createServiceTicketFromCall if they report issues. ` +
                    `Be empathetic and thorough.`,
                },
              ],
            },
          },
          metadata: {
            jobId: doc.id,
            callType: 'completion_verification',
          },
        });

        // Update job with call tracking
        await doc.ref.update({
          verificationCallId: call.id,
          verificationCalledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Store call record
        await db.collection('voiceCalls').add({
          jobId: doc.id,
          vapiCallId: call.id,
          phoneNumber: job.customer.phone,
          customerName,
          callType: 'completion_verification',
          status: 'initiated',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        results.push({ jobId: doc.id, success: true });
        console.log(`Verification call initiated for job ${doc.id}, call ID: ${call.id}`);
      } catch (error) {
        console.error(`Failed to call for job ${doc.id}:`, error);
        results.push({
          jobId: doc.id,
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
    console.error('Error processing verification calls:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process calls' },
      { status: 500 }
    );
  }
}

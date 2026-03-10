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

    // Find jobs with scheduled quote follow-up calls that haven't been placed yet
    const jobsSnapshot = await db
      .collection('jobs')
      .where('quoteFollowUpScheduledAt', '<=', now)
      .where('status', '==', 'sold')
      .limit(5)
      .get();

    const results: Array<{ jobId: string; success: boolean; error?: string }> = [];

    for (const doc of jobsSnapshot.docs) {
      const job = doc.data();

      // Skip if already has a follow-up call
      if (job.quoteFollowUpCallId) {
        continue;
      }

      // Skip if no customer phone
      if (!job.customer?.phone) {
        results.push({ jobId: doc.id, success: false, error: 'No customer phone number' });
        continue;
      }

      try {
        const customerName = job.customer.name || 'there';
        const contractValue = job.commission?.contractValue || 0;
        const jobType = job.type || job.trade || 'project';

        // Create outbound call with assistant overrides injecting job context
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
                    `You are Riley, a friendly follow-up specialist from KeyHub Central. ` +
                    `You are calling ${customerName} to follow up on their ${jobType} quote. ` +
                    `The contract value is $${contractValue.toLocaleString()}. ` +
                    `Job ID: ${doc.id}. ` +
                    `Your goal is to answer any questions they have about the quote, address concerns, ` +
                    `and help them move forward with the project. Be warm, helpful, and not pushy.`,
                },
              ],
            },
          },
          metadata: {
            jobId: doc.id,
            callType: 'quote_followup',
          },
        });

        // Update job with call tracking
        await doc.ref.update({
          quoteFollowUpCallId: call.id,
          quoteFollowUpCalledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Store call record
        await db.collection('voiceCalls').add({
          jobId: doc.id,
          vapiCallId: call.id,
          phoneNumber: job.customer.phone,
          customerName,
          callType: 'quote_followup',
          status: 'initiated',
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        results.push({ jobId: doc.id, success: true });
        console.log(`Quote follow-up call initiated for job ${doc.id}, call ID: ${call.id}`);
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
    console.error('Error processing quote follow-up calls:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process calls' },
      { status: 500 }
    );
  }
}

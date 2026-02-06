import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { sendSms } from '@/lib/sms/provider';
import { getInitialMessage } from '@/lib/sms/ai';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

// Process scheduled SMS messages (called by cron job)
async function processScheduledSms() {
  const db = getAdminDb();
  const now = Timestamp.now();

  // Find leads that:
  // 1. Have a scheduled SMS time in the past
  // 2. Have auto-SMS enabled
  // 3. Have a phone number
  // 4. Are in new or assigned status
  const leadsSnapshot = await db
    .collection('leads')
    .where('scheduledSmsAt', '<=', now)
    .where('status', 'in', ['new', 'assigned'])
    .limit(10) // Process in batches
    .get();

  console.log(`Found ${leadsSnapshot.size} leads to send SMS`);

  const results: Array<{ leadId: string; success: boolean; error?: string }> = [];

  for (const doc of leadsSnapshot.docs) {
    const lead = doc.data();

    // Skip if no phone number
    if (!lead.customer?.phone) {
      await doc.ref.update({
        scheduledSmsAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      results.push({ leadId: doc.id, success: false, error: 'No phone number' });
      continue;
    }

    // Skip if already has active SMS conversation
    if (lead.lastSmsOutcome === 'completed') {
      await doc.ref.update({
        scheduledSmsAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      results.push({ leadId: doc.id, success: false, error: 'Already contacted via SMS' });
      continue;
    }

    // Skip if max attempts reached (3 attempts)
    const attempts = lead.smsAttempts || 0;
    if (attempts >= 3) {
      await doc.ref.update({
        scheduledSmsAt: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
      results.push({ leadId: doc.id, success: false, error: 'Max SMS attempts reached' });
      continue;
    }

    try {
      // Get customer name for personalization
      const customerName =
        lead.customer.name ||
        `${lead.customer.firstName || ''} ${lead.customer.lastName || ''}`.trim() ||
        'there';

      // Generate initial message
      const message = getInitialMessage(customerName);

      console.log(`SMS attempt for lead ${doc.id}, attempt ${attempts + 1}`);

      // Send SMS
      const result = await sendSms(lead.customer.phone, message);

      if (!result.success) {
        throw new Error(result.error || 'Failed to send SMS');
      }

      console.log(`SMS sent for lead ${doc.id}, SID: ${result.messageSid}`);

      // Create SMS conversation record
      const conversationRef = await db.collection('smsConversations').add({
        leadId: doc.id,
        phoneNumber: lead.customer.phone,
        customerName,
        status: 'active',
        messages: [
          {
            role: 'assistant',
            content: message,
            timestamp: FieldValue.serverTimestamp(),
            messageSid: result.messageSid,
            status: 'sent',
          },
        ],
        messageCount: 1,
        analysis: null,
        startedAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update lead
      await doc.ref.update({
        lastSmsAt: FieldValue.serverTimestamp(),
        lastSmsConversationId: conversationRef.id,
        lastSmsOutcome: 'in_progress',
        smsAttempts: attempts + 1,
        smsMessageCount: 1,
        scheduledSmsAt: null, // Clear scheduled time
        updatedAt: FieldValue.serverTimestamp(),
      });

      results.push({ leadId: doc.id, success: true });
    } catch (error) {
      console.error(`SMS failed for lead ${doc.id}:`, error instanceof Error ? error.message : 'Unknown error');

      // Schedule retry in 1 hour if not max attempts
      if (attempts < 2) {
        const retryTime = new Date();
        retryTime.setHours(retryTime.getHours() + 1);

        await doc.ref.update({
          scheduledSmsAt: Timestamp.fromDate(retryTime),
          smsAttempts: attempts + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        await doc.ref.update({
          scheduledSmsAt: null,
          smsAttempts: attempts + 1,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      results.push({
        leadId: doc.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return results;
}

// POST - Process scheduled SMS (manual trigger)
export async function POST(request: NextRequest) {
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

    const results = await processScheduledSms();

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Error processing scheduled SMS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process SMS' },
      { status: 500 }
    );
  }
}

// GET - Process scheduled SMS (used by Vercel cron)
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

    const results = await processScheduledSms();

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Error processing scheduled SMS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process SMS' },
      { status: 500 }
    );
  }
}

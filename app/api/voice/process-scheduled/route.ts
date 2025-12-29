import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { createOutboundCall } from '@/lib/vapi/client';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

// POST - Process scheduled calls (called by cron job)
export async function POST(request: NextRequest) {
  try {
    // Verify the request is from an authorized source
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    // Find leads that:
    // 1. Have a scheduled call time in the past
    // 2. Haven't been called yet or had a failed call
    // 3. Have auto-call enabled
    // 4. Have a phone number
    const leadsSnapshot = await db
      .collection('leads')
      .where('scheduledCallAt', '<=', now)
      .where('status', 'in', ['new', 'assigned']) // Only call new or assigned leads
      .limit(10) // Process in batches
      .get();

    const results: Array<{ leadId: string; success: boolean; error?: string }> = [];

    for (const doc of leadsSnapshot.docs) {
      const lead = doc.data();

      // Skip if no phone number
      if (!lead.customer?.phone) {
        await doc.ref.update({
          scheduledCallAt: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.push({ leadId: doc.id, success: false, error: 'No phone number' });
        continue;
      }

      // Skip if already contacted
      if (lead.lastCallOutcome === 'answered') {
        await doc.ref.update({
          scheduledCallAt: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.push({ leadId: doc.id, success: false, error: 'Already contacted' });
        continue;
      }

      // Skip if max attempts reached (3 attempts)
      const attempts = lead.callAttempts || 0;
      if (attempts >= 3) {
        await doc.ref.update({
          scheduledCallAt: null,
          updatedAt: FieldValue.serverTimestamp(),
        });
        results.push({ leadId: doc.id, success: false, error: 'Max attempts reached' });
        continue;
      }

      try {
        // Make the call - use firstName for more natural greeting
        const customerName = lead.customer.firstName || lead.customer.name?.split(' ')[0] || 'there';
        const call = await createOutboundCall(
          lead.customer.phone,
          customerName,
          { leadId: doc.id, attempt: attempts + 1 }
        );

        // Update lead
        await doc.ref.update({
          lastCallAt: FieldValue.serverTimestamp(),
          lastCallId: call.id,
          callAttempts: attempts + 1,
          scheduledCallAt: null, // Clear scheduled time
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Store call record
        await db.collection('voiceCalls').add({
          leadId: doc.id,
          vapiCallId: call.id,
          phoneNumber: lead.customer.phone,
          customerName: lead.customer.name,
          status: call.status,
          attempt: attempts + 1,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        results.push({ leadId: doc.id, success: true });
        console.log(`Call initiated for lead ${doc.id}, call ID: ${call.id}`);
      } catch (error) {
        console.error(`Failed to call lead ${doc.id}:`, error);

        // Schedule retry in 1 hour if not max attempts
        if (attempts < 2) {
          const retryTime = new Date();
          retryTime.setHours(retryTime.getHours() + 1);

          await doc.ref.update({
            scheduledCallAt: Timestamp.fromDate(retryTime),
            callAttempts: attempts + 1,
            updatedAt: FieldValue.serverTimestamp(),
          });
        } else {
          await doc.ref.update({
            scheduledCallAt: null,
            callAttempts: attempts + 1,
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

    return NextResponse.json({
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Error processing scheduled calls:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process calls' },
      { status: 500 }
    );
  }
}

// GET - Check status (for debugging)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    // Count pending scheduled calls
    const pendingSnapshot = await db
      .collection('leads')
      .where('scheduledCallAt', '!=', null)
      .get();

    const pendingCount = pendingSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.scheduledCallAt && data.scheduledCallAt <= now;
    }).length;

    const upcomingCount = pendingSnapshot.docs.filter((doc) => {
      const data = doc.data();
      return data.scheduledCallAt && data.scheduledCallAt > now;
    }).length;

    return NextResponse.json({
      pendingCalls: pendingCount,
      upcomingCalls: upcomingCount,
      totalScheduled: pendingSnapshot.size,
    });
  } catch (error) {
    console.error('Error getting scheduled calls status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get status' },
      { status: 500 }
    );
  }
}

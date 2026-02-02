import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { createOutboundCall } from '@/lib/vapi/client';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// ===========================================
// FEATURE FLAG - Set to true to re-enable Vapi auto-calls
// ===========================================
const ENABLE_VAPI_AUTO_CALLS = false;
// ===========================================

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

// POST - Process scheduled calls (called by cron job)
export async function POST(request: NextRequest) {
  // Feature flag - return early if auto-calls disabled
  if (!ENABLE_VAPI_AUTO_CALLS) {
    return NextResponse.json({
      message: 'Vapi auto-calls are currently disabled',
      processed: 0,
      results: []
    });
  }

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
        // Make the call - use full name for greeting
        const customerName = lead.customer.name || `${lead.customer.firstName || ''} ${lead.customer.lastName || ''}`.trim() || 'there';
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

// GET - Process scheduled calls (used by Vercel cron)
export async function GET(request: NextRequest) {
  // Feature flag - return early if auto-calls disabled
  if (!ENABLE_VAPI_AUTO_CALLS) {
    return NextResponse.json({
      message: 'Vapi auto-calls are currently disabled',
      processed: 0,
      results: []
    });
  }

  try {
    // Vercel cron sends authorization header automatically
    const authHeader = request.headers.get('authorization');
    if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getAdminDb();
    const now = Timestamp.now();

    // Find leads that need to be called
    const leadsSnapshot = await db
      .collection('leads')
      .where('scheduledCallAt', '<=', now)
      .where('status', 'in', ['new', 'assigned'])
      .limit(10)
      .get();

    console.log(`Found ${leadsSnapshot.size} leads to process`);

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
        // Make the call - use full name for greeting
        const customerName = lead.customer.name || `${lead.customer.firstName || ''} ${lead.customer.lastName || ''}`.trim() || 'there';
        const phoneNumber = lead.customer.phone;

        console.log(`=== VAPI CALL ATTEMPT ===`);
        console.log(`Lead ID: ${doc.id}`);
        console.log(`Customer Name: ${customerName}`);
        console.log(`Phone Number: ${phoneNumber}`);
        console.log(`Attempt: ${attempts + 1}`);
        console.log(`VAPI_API_KEY exists: ${!!process.env.VAPI_API_KEY}`);
        console.log(`VAPI_PHONE_NUMBER_ID exists: ${!!process.env.VAPI_PHONE_NUMBER_ID}`);
        console.log(`VAPI_ASSISTANT_ID exists: ${!!process.env.VAPI_ASSISTANT_ID}`);
        console.log(`VAPI_PHONE_NUMBER_ID value: ${process.env.VAPI_PHONE_NUMBER_ID}`);

        const call = await createOutboundCall(
          phoneNumber,
          customerName,
          { leadId: doc.id, attempt: attempts + 1 }
        );

        console.log(`=== VAPI CALL SUCCESS ===`);
        console.log(`Call ID: ${call.id}`);
        console.log(`Call Status: ${call.status}`);

        // Update lead
        await doc.ref.update({
          lastCallAt: FieldValue.serverTimestamp(),
          lastCallId: call.id,
          callAttempts: attempts + 1,
          scheduledCallAt: null,
          updatedAt: FieldValue.serverTimestamp(),
        });

        // Store call record
        await db.collection('voiceCalls').add({
          leadId: doc.id,
          vapiCallId: call.id,
          phoneNumber: lead.customer.phone,
          customerName: customerName,
          status: call.status,
          attempt: attempts + 1,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        results.push({ leadId: doc.id, success: true });
      } catch (error) {
        console.error(`=== VAPI CALL FAILED ===`);
        console.error(`Lead ID: ${doc.id}`);
        console.error(`Error:`, error);
        console.error(`Error message:`, error instanceof Error ? error.message : 'Unknown');

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

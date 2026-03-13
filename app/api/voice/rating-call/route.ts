import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { createRatingCall } from '@/lib/vapi/client';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

async function processRatingCalls(request: NextRequest) {
  if (!CRON_SECRET) {
    console.error('CRON_SECRET not configured - rejecting request');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const now = Timestamp.now();

  // Find completed jobs with a rating call due and not yet sent
  const jobsSnapshot = await db
    .collection('jobs')
    .where('status', '==', 'complete')
    .where('ratingCallScheduledAt', '<=', now)
    .where('ratingCallSent', '==', false)
    .limit(10)
    .get();

  console.log(`Rating call cron: found ${jobsSnapshot.size} jobs to process`);

  const results: Array<{ jobId: string; success: boolean; error?: string }> = [];

  for (const doc of jobsSnapshot.docs) {
    const job = doc.data();

    // Skip if no phone number
    const phone = job.customer?.phone;
    if (!phone) {
      await doc.ref.update({
        ratingCallSent: true,
        ratingCallSkippedReason: 'no_phone',
        updatedAt: FieldValue.serverTimestamp(),
      });
      results.push({ jobId: doc.id, success: false, error: 'No phone number' });
      continue;
    }

    // Skip if already rated
    if (job.customerRating) {
      await doc.ref.update({
        ratingCallSent: true,
        ratingCallSkippedReason: 'already_rated',
        updatedAt: FieldValue.serverTimestamp(),
      });
      results.push({ jobId: doc.id, success: false, error: 'Already rated' });
      continue;
    }

    const customerName =
      job.customer?.name ||
      `${job.customer?.firstName || ''} ${job.customer?.lastName || ''}`.trim() ||
      'there';

    try {
      const call = await createRatingCall(phone, customerName, doc.id);

      await doc.ref.update({
        ratingCallSent: true,
        ratingCallId: call.id,
        ratingCallSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Log in voiceCalls collection
      await db.collection('voiceCalls').add({
        jobId: doc.id,
        vapiCallId: call.id,
        phoneNumber: phone,
        customerName,
        callType: 'rating',
        status: call.status,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      results.push({ jobId: doc.id, success: true });
      console.log(`Rating call initiated for job ${doc.id}, call ID: ${call.id}`);
    } catch (error) {
      console.error(`Rating call failed for job ${doc.id}:`, error);

      // Mark as sent to avoid infinite retry loop — manual re-trigger if needed
      await doc.ref.update({
        ratingCallSent: true,
        ratingCallError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: FieldValue.serverTimestamp(),
      });

      results.push({
        jobId: doc.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(request: NextRequest) {
  try {
    return await processRatingCalls(request);
  } catch (error) {
    console.error('Error in rating-call cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process rating calls' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await processRatingCalls(request);
  } catch (error) {
    console.error('Error in rating-call cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process rating calls' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { createAppointmentReminderCall } from '@/lib/vapi/client';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const CRON_SECRET = process.env.CRON_SECRET;

function formatDate(ts: FirebaseFirestore.Timestamp): string {
  return ts.toDate().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

async function processReminders(request: NextRequest) {
  if (!CRON_SECRET) {
    console.error('CRON_SECRET not configured');
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getAdminDb();
  const now = Timestamp.now();
  const nowMs = now.toMillis();

  // Find scheduled jobs that haven't had both reminders sent
  const jobsSnapshot = await db
    .collection('jobs')
    .where('status', '==', 'scheduled')
    .where('reminderDayBeforeSent', '==', false)
    .limit(20)
    .get();

  // Also fetch jobs that need morning-of reminders
  const morningSnapshot = await db
    .collection('jobs')
    .where('status', '==', 'scheduled')
    .where('reminderMorningOfSent', '==', false)
    .limit(20)
    .get();

  const results: Array<{ jobId: string; timing: string; success: boolean; error?: string }> = [];

  // Process day-before reminders
  for (const doc of jobsSnapshot.docs) {
    const job = doc.data();
    const scheduledStart = job.dates?.scheduledStart as Timestamp | undefined;
    if (!scheduledStart) continue;

    const startMs = scheduledStart.toMillis();
    const hoursUntil = (startMs - nowMs) / (1000 * 60 * 60);

    // Day-before window: between 20h and 28h before start
    if (hoursUntil < 20 || hoursUntil > 28) continue;

    const phone = job.customer?.phone;
    if (!phone) {
      await doc.ref.update({ reminderDayBeforeSent: true, updatedAt: FieldValue.serverTimestamp() });
      results.push({ jobId: doc.id, timing: 'day_before', success: false, error: 'No phone' });
      continue;
    }

    const customerName = job.customer?.name || 'there';
    const jobType = job.type || job.trade || 'renovation';
    const scheduledDate = formatDate(scheduledStart);

    try {
      const call = await createAppointmentReminderCall(
        phone,
        customerName,
        doc.id,
        jobType,
        scheduledDate,
        'day_before'
      );

      await doc.ref.update({
        reminderDayBeforeSent: true,
        reminderDayBeforeCallId: call.id,
        reminderDayBeforeSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await db.collection('voiceCalls').add({
        jobId: doc.id,
        vapiCallId: call.id,
        phoneNumber: phone,
        customerName,
        callType: 'appointment_reminder_day_before',
        status: call.status,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      results.push({ jobId: doc.id, timing: 'day_before', success: true });
      console.log(`Day-before reminder sent for job ${doc.id}, call ${call.id}`);
    } catch (error) {
      console.error(`Day-before reminder failed for job ${doc.id}:`, error);
      await doc.ref.update({
        reminderDayBeforeSent: true,
        reminderDayBeforeError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: FieldValue.serverTimestamp(),
      });
      results.push({
        jobId: doc.id,
        timing: 'day_before',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Process morning-of reminders
  for (const doc of morningSnapshot.docs) {
    // Skip if already processed in the day-before pass above
    if (results.find((r) => r.jobId === doc.id && r.timing === 'day_before')) continue;

    const job = doc.data();
    const scheduledStart = job.dates?.scheduledStart as Timestamp | undefined;
    if (!scheduledStart) continue;

    const startMs = scheduledStart.toMillis();
    const hoursUntil = (startMs - nowMs) / (1000 * 60 * 60);

    // Morning-of window: between 1h and 4h before start
    if (hoursUntil < 1 || hoursUntil > 4) continue;

    // Skip if customer already cancelled/rescheduled
    if (job.appointmentConfirmationResponse === 'cancelled') continue;

    const phone = job.customer?.phone;
    if (!phone) {
      await doc.ref.update({ reminderMorningOfSent: true, updatedAt: FieldValue.serverTimestamp() });
      results.push({ jobId: doc.id, timing: 'morning_of', success: false, error: 'No phone' });
      continue;
    }

    const customerName = job.customer?.name || 'there';
    const jobType = job.type || job.trade || 'renovation';
    const scheduledDate = formatDate(scheduledStart);

    try {
      const call = await createAppointmentReminderCall(
        phone,
        customerName,
        doc.id,
        jobType,
        scheduledDate,
        'morning_of'
      );

      await doc.ref.update({
        reminderMorningOfSent: true,
        reminderMorningOfCallId: call.id,
        reminderMorningOfSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await db.collection('voiceCalls').add({
        jobId: doc.id,
        vapiCallId: call.id,
        phoneNumber: phone,
        customerName,
        callType: 'appointment_reminder_morning_of',
        status: call.status,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      results.push({ jobId: doc.id, timing: 'morning_of', success: true });
      console.log(`Morning-of reminder sent for job ${doc.id}, call ${call.id}`);
    } catch (error) {
      console.error(`Morning-of reminder failed for job ${doc.id}:`, error);
      await doc.ref.update({
        reminderMorningOfSent: true,
        reminderMorningOfError: error instanceof Error ? error.message : 'Unknown error',
        updatedAt: FieldValue.serverTimestamp(),
      });
      results.push({
        jobId: doc.id,
        timing: 'morning_of',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}

export async function GET(request: NextRequest) {
  try {
    return await processReminders(request);
  } catch (error) {
    console.error('Error in appointment-reminder cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process reminders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await processReminders(request);
  } catch (error) {
    console.error('Error in appointment-reminder cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process reminders' },
      { status: 500 }
    );
  }
}

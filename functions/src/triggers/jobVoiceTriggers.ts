import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const getDb = () => admin.firestore();

/**
 * When a job transitions to 'sold', schedule a quote follow-up call 24 hours later.
 * When a job transitions to 'complete', schedule a verification call 2 hours later.
 */
export const onJobStatusChangeForVoice = functions.firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const jobId = context.params.jobId;

    const beforeStatus = beforeData.status;
    const afterStatus = afterData.status;

    // No status change
    if (beforeStatus === afterStatus) return null;

    const db = getDb();

    // === QUOTE FOLLOW-UP (Phase 4) ===
    // When job moves to 'sold', schedule follow-up call in 24 hours
    if (afterStatus === 'sold' && beforeStatus !== 'sold') {
      const followUpAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      await db.collection('jobs').doc(jobId).update({
        quoteFollowUpScheduledAt: admin.firestore.Timestamp.fromDate(followUpAt),
        quoteFollowUpCallId: null,
        quoteFollowUpOutcome: null,
      });

      console.log(`Scheduled quote follow-up for job ${jobId} at ${followUpAt.toISOString()}`);
    }

    // === COMPLETION VERIFICATION (Phase 6) ===
    // When job moves to 'complete', schedule verification call in 2 hours
    if (afterStatus === 'complete' && beforeStatus !== 'complete') {
      const verifyAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now

      await db.collection('jobs').doc(jobId).update({
        verificationCallScheduledAt: admin.firestore.Timestamp.fromDate(verifyAt),
        verificationCallId: null,
        customerVerified: null,
        customerRating: null,
        customerFeedback: null,
      });

      console.log(`Scheduled verification call for job ${jobId} at ${verifyAt.toISOString()}`);
    }

    return null;
  });

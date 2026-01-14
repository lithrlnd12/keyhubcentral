import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Rating request status types
type RatingRequestStatus = 'pending' | 'completed' | 'expired';

// Token generation for rating requests
function generateRatingToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

const RATING_REQUEST_EXPIRY_DAYS = 30;

/**
 * When a job status changes to 'complete', create rating requests
 * for each crew member and send rating request emails
 */
export const onJobComplete = functions.firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const jobId = context.params.jobId;

    // Only trigger when status changes to 'complete'
    if (before.status === after.status || after.status !== 'complete') {
      return null;
    }

    // Check if job has crew members
    const crewIds = after.crewIds as string[] || [];
    if (crewIds.length === 0) {
      console.log(`Job ${jobId} has no crew members, skipping rating requests`);
      return null;
    }

    // Check if customer has email
    const customerEmail = after.customer?.email;
    if (!customerEmail) {
      console.log(`Job ${jobId} has no customer email, skipping rating requests`);
      return null;
    }

    try {
      // Create rating requests for each crew member
      const batch = db.batch();
      const createdRequests: any[] = [];

      for (const contractorId of crewIds) {
        // Get contractor details
        const contractorDoc = await db.collection('contractors').doc(contractorId).get();
        if (!contractorDoc.exists) {
          console.log(`Contractor ${contractorId} not found, skipping`);
          continue;
        }

        const contractor = contractorDoc.data();
        const token = generateRatingToken();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + RATING_REQUEST_EXPIRY_DAYS);

        const requestRef = db.collection('ratingRequests').doc();
        const ratingRequest = {
          jobId,
          jobNumber: after.jobNumber || '',
          contractorId,
          contractorName: contractor?.businessName || 'Contractor',
          customerEmail,
          customerName: after.customer?.name || 'Customer',
          token,
          status: 'pending' as RatingRequestStatus,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        batch.set(requestRef, ratingRequest);
        createdRequests.push({ id: requestRef.id, ...ratingRequest });
      }

      await batch.commit();
      console.log(`Created ${createdRequests.length} rating requests for job ${jobId}`);

      // TODO: Send rating request emails via email trigger
      // This would typically trigger another Cloud Function or use SendGrid/etc

      return null;
    } catch (error) {
      console.error(`Error creating rating requests for job ${jobId}:`, error);
      return null;
    }
  });

/**
 * When an invoice is paid, send reminder for any pending rating requests
 */
export const onInvoicePaid = functions.firestore
  .document('invoices/{invoiceId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes to 'paid'
    if (before.status === after.status || after.status !== 'paid') {
      return null;
    }

    // Check if invoice is linked to a job
    const jobId = after.jobId;
    if (!jobId) {
      return null;
    }

    try {
      // Find pending rating requests for this job
      const requestsSnapshot = await db
        .collection('ratingRequests')
        .where('jobId', '==', jobId)
        .where('status', '==', 'pending')
        .get();

      if (requestsSnapshot.empty) {
        console.log(`No pending rating requests for job ${jobId}`);
        return null;
      }

      // Filter to those without reminder sent
      const needsReminder = requestsSnapshot.docs.filter(
        (doc) => !doc.data().reminderSentAt
      );

      if (needsReminder.length === 0) {
        console.log(`All rating requests for job ${jobId} already reminded`);
        return null;
      }

      // Mark reminder sent for each
      const batch = db.batch();
      for (const doc of needsReminder) {
        batch.update(doc.ref, {
          reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      console.log(`Sent ${needsReminder.length} rating reminders for job ${jobId}`);

      // TODO: Send reminder emails via email trigger

      return null;
    } catch (error) {
      console.error(`Error sending rating reminders for job ${jobId}:`, error);
      return null;
    }
  });

/**
 * When a rating is submitted, update the contractor's customer rating
 */
export const onRatingSubmitted = functions.firestore
  .document('ratingRequests/{requestId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Only trigger when status changes to 'completed'
    if (before.status === after.status || after.status !== 'completed') {
      return null;
    }

    const contractorId = after.contractorId;
    const rating = after.rating as number;

    if (!contractorId || !rating) {
      console.log('Missing contractor ID or rating');
      return null;
    }

    try {
      // Get all completed ratings for this contractor
      const ratingsSnapshot = await db
        .collection('ratingRequests')
        .where('contractorId', '==', contractorId)
        .where('status', '==', 'completed')
        .get();

      // Calculate new average
      const ratings = ratingsSnapshot.docs.map((doc) => doc.data().rating as number);
      const sum = ratings.reduce((acc, r) => acc + r, 0);
      const avgRating = Math.round((sum / ratings.length) * 10) / 10;

      // Update contractor's customer rating
      const contractorRef = db.collection('contractors').doc(contractorId);
      const contractorDoc = await contractorRef.get();

      if (!contractorDoc.exists) {
        console.log(`Contractor ${contractorId} not found`);
        return null;
      }

      const contractorData = contractorDoc.data();
      const currentRating = contractorData?.rating || {};

      // Calculate new overall rating using the formula:
      // 40% customer + 20% speed + 20% warranty + 20% internal
      const customerWeight = 0.4;
      const speedWeight = 0.2;
      const warrantyWeight = 0.2;
      const internalWeight = 0.2;

      const newOverall =
        avgRating * customerWeight +
        (currentRating.speed || 3) * speedWeight +
        (currentRating.warranty || 3) * warrantyWeight +
        (currentRating.internal || 3) * internalWeight;

      await contractorRef.update({
        'rating.customer': avgRating,
        'rating.overall': Math.round(newOverall * 10) / 10,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `Updated contractor ${contractorId} customer rating to ${avgRating}, overall to ${newOverall.toFixed(1)}`
      );

      return null;
    } catch (error) {
      console.error(`Error updating contractor rating:`, error);
      return null;
    }
  });

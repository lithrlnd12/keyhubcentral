import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { rebuildAgingReport, rebuildAllInvoiceTabs } from '../lib/sheetsSync';

/**
 * Daily task to update overdue status and rebuild aging report
 * Runs every day at 6:00 AM UTC
 */
export const dailyOverdueCheck = functions.pubsub
  .schedule('0 6 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    console.log('Running daily overdue check...');

    try {
      const db = admin.firestore();
      const now = new Date();

      // Find sent invoices that are past due
      const sentInvoices = await db
        .collection('invoices')
        .where('status', '==', 'sent')
        .get();

      let overdueCount = 0;

      for (const doc of sentInvoices.docs) {
        const invoice = doc.data();
        const dueDate = invoice.dueDate.toDate();

        if (dueDate < now) {
          overdueCount++;
        }
      }

      console.log(`Found ${overdueCount} overdue invoices`);

      // Rebuild aging report with current data
      await rebuildAgingReport();

      console.log('Daily overdue check completed');
    } catch (error) {
      console.error('Error in daily overdue check:', error);
    }
  });

/**
 * Weekly full rebuild of all sheets (backup/recovery)
 * Runs every Sunday at 2:00 AM UTC
 */
export const weeklyFullRebuild = functions.pubsub
  .schedule('0 2 * * 0')
  .timeZone('America/New_York')
  .onRun(async () => {
    console.log('Running weekly full sheets rebuild...');

    try {
      await rebuildAllInvoiceTabs();
      console.log('Weekly full rebuild completed');
    } catch (error) {
      console.error('Error in weekly full rebuild:', error);
    }
  });

/**
 * HTTP callable function to manually trigger a full rebuild
 * Useful for admin troubleshooting
 */
export const manualRebuildSheets = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated and is admin/owner
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const db = admin.firestore();
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  const userData = userDoc.data();

  if (!userData || !['owner', 'admin'].includes(userData.role)) {
    throw new functions.https.HttpsError('permission-denied', 'Must be admin or owner');
  }

  console.log(`Manual rebuild triggered by ${context.auth.uid}`);

  try {
    await rebuildAllInvoiceTabs();
    return { success: true, message: 'Sheets rebuilt successfully' };
  } catch (error) {
    console.error('Error in manual rebuild:', error);
    throw new functions.https.HttpsError('internal', 'Failed to rebuild sheets');
  }
});

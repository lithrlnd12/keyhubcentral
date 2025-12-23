import * as functions from 'firebase-functions';
import {
  syncInvoiceToSheets,
  removeInvoiceFromSheets,
  rebuildAgingReport,
  rebuildMonthlySummary,
} from '../lib/sheetsSync';

/**
 * Trigger when a new invoice is created
 */
export const onInvoiceCreated = functions.firestore
  .document('invoices/{invoiceId}')
  .onCreate(async (snapshot) => {
    try {
      const invoice = snapshot.data();
      console.log(`Invoice created: ${invoice.invoiceNumber}`);

      await syncInvoiceToSheets(invoice as Parameters<typeof syncInvoiceToSheets>[0]);

      console.log(`Successfully synced invoice ${invoice.invoiceNumber} to sheets`);
    } catch (error) {
      console.error('Error syncing invoice to sheets:', error);
    }
  });

/**
 * Trigger when an invoice is updated
 */
export const onInvoiceUpdated = functions.firestore
  .document('invoices/{invoiceId}')
  .onUpdate(async (change) => {
    try {
      const beforeData = change.before.data();
      const afterData = change.after.data();

      console.log(
        `Invoice updated: ${afterData.invoiceNumber} (${beforeData.status} -> ${afterData.status})`
      );

      await syncInvoiceToSheets(afterData as Parameters<typeof syncInvoiceToSheets>[0]);

      // If status changed to paid, rebuild monthly summary
      if (beforeData.status !== 'paid' && afterData.status === 'paid') {
        await rebuildMonthlySummary();
      }

      // If status changed from or to sent, rebuild aging report
      if (beforeData.status !== afterData.status) {
        if (beforeData.status === 'sent' || afterData.status === 'sent') {
          await rebuildAgingReport();
        }
      }

      console.log(`Successfully updated invoice ${afterData.invoiceNumber} in sheets`);
    } catch (error) {
      console.error('Error updating invoice in sheets:', error);
    }
  });

/**
 * Trigger when an invoice is deleted
 */
export const onInvoiceDeleted = functions.firestore
  .document('invoices/{invoiceId}')
  .onDelete(async (snapshot) => {
    try {
      const invoice = snapshot.data();
      console.log(`Invoice deleted: ${invoice.invoiceNumber}`);

      await removeInvoiceFromSheets(invoice.invoiceNumber);

      // Rebuild reports
      if (invoice.status === 'sent') {
        await rebuildAgingReport();
      }
      if (invoice.status === 'paid') {
        await rebuildMonthlySummary();
      }

      console.log(`Successfully removed invoice ${invoice.invoiceNumber} from sheets`);
    } catch (error) {
      console.error('Error removing invoice from sheets:', error);
    }
  });

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onInvoiceDeleted = exports.onInvoiceUpdated = exports.onInvoiceCreated = void 0;
const functions = require("firebase-functions");
const sheetsSync_1 = require("../lib/sheetsSync");
// Define secrets for Google Sheets access
const runtimeOpts = {
    secrets: ['GOOGLE_SERVICE_ACCOUNT_KEY', 'GOOGLE_SHEETS_SPREADSHEET_ID'],
};
/**
 * Trigger when a new invoice is created
 */
exports.onInvoiceCreated = functions
    .runWith(runtimeOpts)
    .firestore.document('invoices/{invoiceId}')
    .onCreate(async (snapshot) => {
    try {
        const invoice = snapshot.data();
        console.log(`Invoice created: ${invoice.invoiceNumber}`);
        await (0, sheetsSync_1.syncInvoiceToSheets)(invoice);
        console.log(`Successfully synced invoice ${invoice.invoiceNumber} to sheets`);
    }
    catch (error) {
        console.error('Error syncing invoice to sheets:', error);
    }
});
/**
 * Trigger when an invoice is updated
 */
exports.onInvoiceUpdated = functions
    .runWith(runtimeOpts)
    .firestore.document('invoices/{invoiceId}')
    .onUpdate(async (change) => {
    try {
        const beforeData = change.before.data();
        const afterData = change.after.data();
        console.log(`Invoice updated: ${afterData.invoiceNumber} (${beforeData.status} -> ${afterData.status})`);
        await (0, sheetsSync_1.syncInvoiceToSheets)(afterData);
        // If status changed to paid, rebuild monthly summary
        if (beforeData.status !== 'paid' && afterData.status === 'paid') {
            await (0, sheetsSync_1.rebuildMonthlySummary)();
        }
        // If status changed from or to sent, rebuild aging report
        if (beforeData.status !== afterData.status) {
            if (beforeData.status === 'sent' || afterData.status === 'sent') {
                await (0, sheetsSync_1.rebuildAgingReport)();
            }
        }
        console.log(`Successfully updated invoice ${afterData.invoiceNumber} in sheets`);
    }
    catch (error) {
        console.error('Error updating invoice in sheets:', error);
    }
});
/**
 * Trigger when an invoice is deleted
 */
exports.onInvoiceDeleted = functions
    .runWith(runtimeOpts)
    .firestore.document('invoices/{invoiceId}')
    .onDelete(async (snapshot) => {
    try {
        const invoice = snapshot.data();
        console.log(`Invoice deleted: ${invoice.invoiceNumber}`);
        await (0, sheetsSync_1.removeInvoiceFromSheets)(invoice.invoiceNumber);
        // Rebuild reports
        if (invoice.status === 'sent') {
            await (0, sheetsSync_1.rebuildAgingReport)();
        }
        if (invoice.status === 'paid') {
            await (0, sheetsSync_1.rebuildMonthlySummary)();
        }
        console.log(`Successfully removed invoice ${invoice.invoiceNumber} from sheets`);
    }
    catch (error) {
        console.error('Error removing invoice from sheets:', error);
    }
});
//# sourceMappingURL=invoiceTriggers.js.map
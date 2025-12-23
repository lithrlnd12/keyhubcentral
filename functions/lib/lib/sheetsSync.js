"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SHEET_TABS = void 0;
exports.invoiceToRow = invoiceToRow;
exports.syncInvoiceToSheets = syncInvoiceToSheets;
exports.removeInvoiceFromSheets = removeInvoiceFromSheets;
exports.rebuildAllInvoiceTabs = rebuildAllInvoiceTabs;
exports.rebuildAgingReport = rebuildAgingReport;
exports.rebuildMonthlySummary = rebuildMonthlySummary;
exports.initializeSheets = initializeSheets;
const admin = require("firebase-admin");
const googleSheets_1 = require("./googleSheets");
// Sheet tab names
exports.SHEET_TABS = {
    ALL_INVOICES: 'All Invoices',
    OUTSTANDING: 'Outstanding',
    OVERDUE: 'Overdue',
    PAID: 'Paid',
    DRAFT: 'Draft',
    KD_INVOICES: 'KD Invoices',
    KTS_INVOICES: 'KTS Invoices',
    KR_INVOICES: 'KR Invoices',
    AGING_REPORT: 'Aging Report',
    MONTHLY_SUMMARY: 'Monthly Summary',
};
// Header row for invoice sheets
const INVOICE_HEADERS = [
    'Invoice #',
    'Status',
    'From Entity',
    'From Name',
    'To Entity',
    'To Name',
    'Subtotal',
    'Discount',
    'Total',
    'Due Date',
    'Days Until Due',
    'Sent Date',
    'Paid Date',
    'Created Date',
];
/**
 * Format entity code to full name
 */
function formatEntityName(entity) {
    switch (entity) {
        case 'kd':
            return 'Keynote Digital';
        case 'kts':
            return 'Key Trade Solutions';
        case 'kr':
            return 'Key Renovations';
        case 'customer':
            return 'Customer';
        case 'subscriber':
            return 'Subscriber';
        default:
            return entity;
    }
}
/**
 * Format timestamp to date string
 */
function formatDate(timestamp) {
    if (!timestamp)
        return '';
    return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
}
/**
 * Calculate days until due (negative if overdue)
 */
function getDaysUntilDue(dueDate) {
    const now = new Date();
    const due = dueDate.toDate();
    const diff = due.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
/**
 * Convert invoice to spreadsheet row
 */
function invoiceToRow(invoice) {
    return [
        invoice.invoiceNumber,
        invoice.status.toUpperCase(),
        formatEntityName(invoice.from.entity),
        invoice.from.name,
        formatEntityName(invoice.to.entity),
        invoice.to.name,
        invoice.subtotal,
        invoice.discount,
        invoice.total,
        formatDate(invoice.dueDate),
        getDaysUntilDue(invoice.dueDate),
        formatDate(invoice.sentAt),
        formatDate(invoice.paidAt),
        formatDate(invoice.createdAt),
    ];
}
/**
 * Determine which tabs an invoice should appear in
 */
function getTabsForInvoice(invoice) {
    const tabs = [exports.SHEET_TABS.ALL_INVOICES];
    // Status-based tabs
    switch (invoice.status) {
        case 'draft':
            tabs.push(exports.SHEET_TABS.DRAFT);
            break;
        case 'sent':
            tabs.push(exports.SHEET_TABS.OUTSTANDING);
            // Check if overdue
            if (getDaysUntilDue(invoice.dueDate) < 0) {
                tabs.push(exports.SHEET_TABS.OVERDUE);
            }
            break;
        case 'paid':
            tabs.push(exports.SHEET_TABS.PAID);
            break;
    }
    // Entity-based tabs
    switch (invoice.from.entity) {
        case 'kd':
            tabs.push(exports.SHEET_TABS.KD_INVOICES);
            break;
        case 'kts':
            tabs.push(exports.SHEET_TABS.KTS_INVOICES);
            break;
        case 'kr':
            tabs.push(exports.SHEET_TABS.KR_INVOICES);
            break;
    }
    return tabs;
}
/**
 * Sync a single invoice to all relevant sheets
 */
async function syncInvoiceToSheets(invoice) {
    const row = invoiceToRow(invoice);
    const tabs = getTabsForInvoice(invoice);
    // Update or append to each relevant tab
    for (const tab of tabs) {
        const updated = await (0, googleSheets_1.updateRowByInvoiceNumber)(tab, invoice.invoiceNumber, row);
        if (!updated) {
            await (0, googleSheets_1.appendToSheet)(tab, row);
        }
    }
    // Remove from tabs this invoice no longer belongs to
    const allTabs = Object.values(exports.SHEET_TABS).filter((t) => t !== exports.SHEET_TABS.AGING_REPORT && t !== exports.SHEET_TABS.MONTHLY_SUMMARY);
    for (const tab of allTabs) {
        if (!tabs.includes(tab)) {
            await (0, googleSheets_1.deleteRowByInvoiceNumber)(tab, invoice.invoiceNumber);
        }
    }
}
/**
 * Remove an invoice from all sheets
 */
async function removeInvoiceFromSheets(invoiceNumber) {
    const tabs = Object.values(exports.SHEET_TABS).filter((t) => t !== exports.SHEET_TABS.AGING_REPORT && t !== exports.SHEET_TABS.MONTHLY_SUMMARY);
    for (const tab of tabs) {
        await (0, googleSheets_1.deleteRowByInvoiceNumber)(tab, invoiceNumber);
    }
}
// Helper to add delay between API calls
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Rebuild all invoice tabs from Firestore data
 */
async function rebuildAllInvoiceTabs() {
    const db = admin.firestore();
    const invoicesSnapshot = await db.collection('invoices').get();
    console.log(`Found ${invoicesSnapshot.size} invoices to sync`);
    // Group invoices by tab
    const tabData = {};
    // Initialize with headers
    for (const tab of Object.values(exports.SHEET_TABS)) {
        if (tab !== exports.SHEET_TABS.AGING_REPORT && tab !== exports.SHEET_TABS.MONTHLY_SUMMARY) {
            tabData[tab] = [INVOICE_HEADERS];
        }
    }
    // Process each invoice
    for (const doc of invoicesSnapshot.docs) {
        const invoice = doc.data();
        const row = invoiceToRow(invoice);
        const tabs = getTabsForInvoice(invoice);
        for (const tab of tabs) {
            tabData[tab].push(row);
        }
    }
    // Write all tabs with delays to avoid rate limiting
    for (const [tab, data] of Object.entries(tabData)) {
        console.log(`Writing ${data.length - 1} invoices to tab: ${tab}`);
        await (0, googleSheets_1.writeToSheet)(tab, data);
        await delay(1000); // 1 second delay
        await (0, googleSheets_1.formatHeaderRow)(tab);
        await delay(1000); // 1 second delay
    }
    // Build special reports
    console.log('Building aging report...');
    await rebuildAgingReport();
    await delay(1000);
    console.log('Building monthly summary...');
    await rebuildMonthlySummary();
    console.log('Rebuild complete!');
}
/**
 * Rebuild the aging report tab
 */
async function rebuildAgingReport() {
    const db = admin.firestore();
    // Get all sent (unpaid) invoices
    const snapshot = await db
        .collection('invoices')
        .where('status', '==', 'sent')
        .get();
    const agingBuckets = {
        '0-30 Days': { count: 0, total: 0, invoices: [] },
        '31-60 Days': { count: 0, total: 0, invoices: [] },
        '61-90 Days': { count: 0, total: 0, invoices: [] },
        '90+ Days': { count: 0, total: 0, invoices: [] },
    };
    for (const doc of snapshot.docs) {
        const invoice = doc.data();
        const daysUntilDue = getDaysUntilDue(invoice.dueDate);
        const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;
        let bucket;
        if (daysOverdue <= 30) {
            bucket = '0-30 Days';
        }
        else if (daysOverdue <= 60) {
            bucket = '31-60 Days';
        }
        else if (daysOverdue <= 90) {
            bucket = '61-90 Days';
        }
        else {
            bucket = '90+ Days';
        }
        agingBuckets[bucket].count++;
        agingBuckets[bucket].total += invoice.total;
        agingBuckets[bucket].invoices.push(invoice.invoiceNumber);
    }
    const data = [
        ['Age Bucket', 'Count', 'Total Amount', 'Invoice Numbers'],
    ];
    for (const [bucket, stats] of Object.entries(agingBuckets)) {
        data.push([
            bucket,
            stats.count,
            stats.total,
            stats.invoices.join(', '),
        ]);
    }
    // Add totals row
    const totalCount = Object.values(agingBuckets).reduce((sum, b) => sum + b.count, 0);
    const totalAmount = Object.values(agingBuckets).reduce((sum, b) => sum + b.total, 0);
    data.push(['TOTAL', totalCount, totalAmount, '']);
    await (0, googleSheets_1.writeToSheet)(exports.SHEET_TABS.AGING_REPORT, data);
    await (0, googleSheets_1.formatHeaderRow)(exports.SHEET_TABS.AGING_REPORT);
}
/**
 * Rebuild the monthly summary tab
 */
async function rebuildMonthlySummary() {
    var _a;
    const db = admin.firestore();
    // Get all paid invoices
    const snapshot = await db
        .collection('invoices')
        .where('status', '==', 'paid')
        .get();
    const monthlyData = {};
    for (const doc of snapshot.docs) {
        const invoice = doc.data();
        const paidDate = ((_a = invoice.paidAt) === null || _a === void 0 ? void 0 : _a.toDate()) || invoice.createdAt.toDate();
        const monthKey = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { count: 0, total: 0 };
        }
        monthlyData[monthKey].count++;
        monthlyData[monthKey].total += invoice.total;
    }
    // Sort by month
    const sortedMonths = Object.keys(monthlyData).sort().reverse();
    const data = [['Month', 'Invoices Paid', 'Total Revenue']];
    for (const month of sortedMonths) {
        data.push([month, monthlyData[month].count, monthlyData[month].total]);
    }
    await (0, googleSheets_1.writeToSheet)(exports.SHEET_TABS.MONTHLY_SUMMARY, data);
    await (0, googleSheets_1.formatHeaderRow)(exports.SHEET_TABS.MONTHLY_SUMMARY);
}
/**
 * Initialize all sheets with headers
 */
async function initializeSheets() {
    for (const tab of Object.values(exports.SHEET_TABS)) {
        if (tab === exports.SHEET_TABS.AGING_REPORT || tab === exports.SHEET_TABS.MONTHLY_SUMMARY) {
            continue; // These have different headers
        }
        await (0, googleSheets_1.writeToSheet)(tab, [INVOICE_HEADERS]);
        await (0, googleSheets_1.formatHeaderRow)(tab);
    }
    // Initialize aging report
    await (0, googleSheets_1.writeToSheet)(exports.SHEET_TABS.AGING_REPORT, [
        ['Age Bucket', 'Count', 'Total Amount', 'Invoice Numbers'],
    ]);
    await (0, googleSheets_1.formatHeaderRow)(exports.SHEET_TABS.AGING_REPORT);
    // Initialize monthly summary
    await (0, googleSheets_1.writeToSheet)(exports.SHEET_TABS.MONTHLY_SUMMARY, [
        ['Month', 'Invoices Paid', 'Total Revenue'],
    ]);
    await (0, googleSheets_1.formatHeaderRow)(exports.SHEET_TABS.MONTHLY_SUMMARY);
}
//# sourceMappingURL=sheetsSync.js.map
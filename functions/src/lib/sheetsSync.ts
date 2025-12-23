import * as admin from 'firebase-admin';
import {
  writeToSheet,
  appendToSheet,
  updateRowByInvoiceNumber,
  deleteRowByInvoiceNumber,
  formatHeaderRow,
} from './googleSheets';

// Sheet tab names
export const SHEET_TABS = {
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
} as const;

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

// Invoice data interface
interface InvoiceData {
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  from: { entity: string; name: string };
  to: { entity: string; name: string };
  subtotal: number;
  discount: number;
  total: number;
  dueDate: admin.firestore.Timestamp;
  sentAt: admin.firestore.Timestamp | null;
  paidAt: admin.firestore.Timestamp | null;
  createdAt: admin.firestore.Timestamp;
}

/**
 * Format entity code to full name
 */
function formatEntityName(entity: string): string {
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
function formatDate(timestamp: admin.firestore.Timestamp | null): string {
  if (!timestamp) return '';
  return timestamp.toDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * Calculate days until due (negative if overdue)
 */
function getDaysUntilDue(dueDate: admin.firestore.Timestamp): number {
  const now = new Date();
  const due = dueDate.toDate();
  const diff = due.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Convert invoice to spreadsheet row
 */
export function invoiceToRow(invoice: InvoiceData): (string | number)[] {
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
function getTabsForInvoice(invoice: InvoiceData): string[] {
  const tabs: string[] = [SHEET_TABS.ALL_INVOICES];

  // Status-based tabs
  switch (invoice.status) {
    case 'draft':
      tabs.push(SHEET_TABS.DRAFT);
      break;
    case 'sent':
      tabs.push(SHEET_TABS.OUTSTANDING);
      // Check if overdue
      if (getDaysUntilDue(invoice.dueDate) < 0) {
        tabs.push(SHEET_TABS.OVERDUE);
      }
      break;
    case 'paid':
      tabs.push(SHEET_TABS.PAID);
      break;
  }

  // Entity-based tabs
  switch (invoice.from.entity) {
    case 'kd':
      tabs.push(SHEET_TABS.KD_INVOICES);
      break;
    case 'kts':
      tabs.push(SHEET_TABS.KTS_INVOICES);
      break;
    case 'kr':
      tabs.push(SHEET_TABS.KR_INVOICES);
      break;
  }

  return tabs;
}

/**
 * Sync a single invoice to all relevant sheets
 */
export async function syncInvoiceToSheets(invoice: InvoiceData): Promise<void> {
  const row = invoiceToRow(invoice);
  const tabs = getTabsForInvoice(invoice);

  // Update or append to each relevant tab
  for (const tab of tabs) {
    const updated = await updateRowByInvoiceNumber(tab, invoice.invoiceNumber, row);
    if (!updated) {
      await appendToSheet(tab, row);
    }
  }

  // Remove from tabs this invoice no longer belongs to
  const allTabs = Object.values(SHEET_TABS).filter(
    (t) => t !== SHEET_TABS.AGING_REPORT && t !== SHEET_TABS.MONTHLY_SUMMARY
  );

  for (const tab of allTabs) {
    if (!tabs.includes(tab)) {
      await deleteRowByInvoiceNumber(tab, invoice.invoiceNumber);
    }
  }
}

/**
 * Remove an invoice from all sheets
 */
export async function removeInvoiceFromSheets(invoiceNumber: string): Promise<void> {
  const tabs = Object.values(SHEET_TABS).filter(
    (t) => t !== SHEET_TABS.AGING_REPORT && t !== SHEET_TABS.MONTHLY_SUMMARY
  );

  for (const tab of tabs) {
    await deleteRowByInvoiceNumber(tab, invoiceNumber);
  }
}

/**
 * Rebuild all invoice tabs from Firestore data
 */
export async function rebuildAllInvoiceTabs(): Promise<void> {
  const db = admin.firestore();
  const invoicesSnapshot = await db.collection('invoices').get();

  // Group invoices by tab
  const tabData: Record<string, (string | number)[][]> = {};

  // Initialize with headers
  for (const tab of Object.values(SHEET_TABS)) {
    if (tab !== SHEET_TABS.AGING_REPORT && tab !== SHEET_TABS.MONTHLY_SUMMARY) {
      tabData[tab] = [INVOICE_HEADERS];
    }
  }

  // Process each invoice
  for (const doc of invoicesSnapshot.docs) {
    const invoice = doc.data() as InvoiceData;
    const row = invoiceToRow(invoice);
    const tabs = getTabsForInvoice(invoice);

    for (const tab of tabs) {
      tabData[tab].push(row);
    }
  }

  // Write all tabs
  for (const [tab, data] of Object.entries(tabData)) {
    await writeToSheet(tab, data);
    await formatHeaderRow(tab);
  }

  // Build special reports
  await rebuildAgingReport();
  await rebuildMonthlySummary();
}

/**
 * Rebuild the aging report tab
 */
export async function rebuildAgingReport(): Promise<void> {
  const db = admin.firestore();

  // Get all sent (unpaid) invoices
  const snapshot = await db
    .collection('invoices')
    .where('status', '==', 'sent')
    .get();

  const agingBuckets = {
    '0-30 Days': { count: 0, total: 0, invoices: [] as string[] },
    '31-60 Days': { count: 0, total: 0, invoices: [] as string[] },
    '61-90 Days': { count: 0, total: 0, invoices: [] as string[] },
    '90+ Days': { count: 0, total: 0, invoices: [] as string[] },
  };

  for (const doc of snapshot.docs) {
    const invoice = doc.data() as InvoiceData;
    const daysUntilDue = getDaysUntilDue(invoice.dueDate);
    const daysOverdue = daysUntilDue < 0 ? Math.abs(daysUntilDue) : 0;

    let bucket: keyof typeof agingBuckets;
    if (daysOverdue <= 30) {
      bucket = '0-30 Days';
    } else if (daysOverdue <= 60) {
      bucket = '31-60 Days';
    } else if (daysOverdue <= 90) {
      bucket = '61-90 Days';
    } else {
      bucket = '90+ Days';
    }

    agingBuckets[bucket].count++;
    agingBuckets[bucket].total += invoice.total;
    agingBuckets[bucket].invoices.push(invoice.invoiceNumber);
  }

  const data: (string | number)[][] = [
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

  await writeToSheet(SHEET_TABS.AGING_REPORT, data);
  await formatHeaderRow(SHEET_TABS.AGING_REPORT);
}

/**
 * Rebuild the monthly summary tab
 */
export async function rebuildMonthlySummary(): Promise<void> {
  const db = admin.firestore();

  // Get all paid invoices
  const snapshot = await db
    .collection('invoices')
    .where('status', '==', 'paid')
    .get();

  const monthlyData: Record<string, { count: number; total: number }> = {};

  for (const doc of snapshot.docs) {
    const invoice = doc.data() as InvoiceData;
    const paidDate = invoice.paidAt?.toDate() || invoice.createdAt.toDate();
    const monthKey = `${paidDate.getFullYear()}-${String(paidDate.getMonth() + 1).padStart(2, '0')}`;

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { count: 0, total: 0 };
    }

    monthlyData[monthKey].count++;
    monthlyData[monthKey].total += invoice.total;
  }

  // Sort by month
  const sortedMonths = Object.keys(monthlyData).sort().reverse();

  const data: (string | number)[][] = [['Month', 'Invoices Paid', 'Total Revenue']];

  for (const month of sortedMonths) {
    data.push([month, monthlyData[month].count, monthlyData[month].total]);
  }

  await writeToSheet(SHEET_TABS.MONTHLY_SUMMARY, data);
  await formatHeaderRow(SHEET_TABS.MONTHLY_SUMMARY);
}

/**
 * Initialize all sheets with headers
 */
export async function initializeSheets(): Promise<void> {
  for (const tab of Object.values(SHEET_TABS)) {
    if (tab === SHEET_TABS.AGING_REPORT || tab === SHEET_TABS.MONTHLY_SUMMARY) {
      continue; // These have different headers
    }
    await writeToSheet(tab, [INVOICE_HEADERS]);
    await formatHeaderRow(tab);
  }

  // Initialize aging report
  await writeToSheet(SHEET_TABS.AGING_REPORT, [
    ['Age Bucket', 'Count', 'Total Amount', 'Invoice Numbers'],
  ]);
  await formatHeaderRow(SHEET_TABS.AGING_REPORT);

  // Initialize monthly summary
  await writeToSheet(SHEET_TABS.MONTHLY_SUMMARY, [
    ['Month', 'Invoices Paid', 'Total Revenue'],
  ]);
  await formatHeaderRow(SHEET_TABS.MONTHLY_SUMMARY);
}

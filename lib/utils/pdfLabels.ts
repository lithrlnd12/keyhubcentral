/**
 * Centralized PDF label strings for translation.
 * These are used by PDF document components and can be
 * pre-translated before passing as props.
 */

export interface PDFLabels {
  // Common
  generatedOn: string;
  page: string;
  total: string;
  subtotal: string;
  notes: string;

  // Job Package
  jobPackage: string;
  jobInformation: string;
  jobNumber: string;
  status: string;
  type: string;
  customer: string;
  phone: string;
  email: string;
  address: string;
  timeline: string;
  created: string;
  sold: string;
  scheduledStart: string;
  actualStart: string;
  targetCompletion: string;
  actualCompletion: string;
  paidInFull: string;
  costBreakdown: string;
  category: string;
  projected: string;
  actual: string;
  material: string;
  labor: string;
  contractsAndAddendums: string;
  signedContracts: string;
  contractType: string;
  signedBy: string;
  signedDate: string;
  addendums: string;
  addendumType: string;
  costImpact: string;
  noChange: string;
  communicationLog: string;
  completionCertificate: string;
  completedBy: string;
  completionDate: string;
  customerSignature: string;
  contractor: string;
  photos: string;
  jobPhotos: string;

  // Invoice
  invoice: string;
  invoiceNumber: string;
  billTo: string;
  issueDate: string;
  dueDate: string;
  description: string;
  quantity: string;
  rate: string;
  amount: string;
  balanceDue: string;
  paymentTerms: string;
  thankYou: string;

  // P&L
  profitAndLoss: string;
  revenue: string;
  expenses: string;
  netIncome: string;
  profitMargin: string;
  summary: string;
  revenueBreakdown: string;
  expenseBreakdown: string;
  count: string;
}

/**
 * Default English labels for PDFs.
 */
export const DEFAULT_PDF_LABELS: PDFLabels = {
  // Common
  generatedOn: 'Generated on',
  page: 'Page',
  total: 'Total',
  subtotal: 'Subtotal',
  notes: 'Notes',

  // Job Package
  jobPackage: 'JOB PACKAGE',
  jobInformation: 'Job Information',
  jobNumber: 'Job Number',
  status: 'Status',
  type: 'Type',
  customer: 'Customer',
  phone: 'Phone',
  email: 'Email',
  address: 'Address',
  timeline: 'Timeline',
  created: 'Created',
  sold: 'Sold',
  scheduledStart: 'Scheduled Start',
  actualStart: 'Actual Start',
  targetCompletion: 'Target Completion',
  actualCompletion: 'Actual Completion',
  paidInFull: 'Paid in Full',
  costBreakdown: 'Cost Breakdown',
  category: 'Category',
  projected: 'Projected',
  actual: 'Actual',
  material: 'Material',
  labor: 'Labor',
  contractsAndAddendums: 'CONTRACTS & ADDENDUMS',
  signedContracts: 'Signed Contracts',
  contractType: 'Contract Type',
  signedBy: 'Signed By',
  signedDate: 'Signed Date',
  addendums: 'Addendums',
  addendumType: 'Addendum Type',
  costImpact: 'Cost Impact',
  noChange: 'No change',
  communicationLog: 'Communication Log',
  completionCertificate: 'Completion Certificate',
  completedBy: 'Completed By',
  completionDate: 'Completion Date',
  customerSignature: 'Customer Signature',
  contractor: 'Contractor',
  photos: 'Photos',
  jobPhotos: 'Job Photos',

  // Invoice
  invoice: 'INVOICE',
  invoiceNumber: 'Invoice Number',
  billTo: 'Bill To',
  issueDate: 'Issue Date',
  dueDate: 'Due Date',
  description: 'Description',
  quantity: 'Qty',
  rate: 'Rate',
  amount: 'Amount',
  balanceDue: 'Balance Due',
  paymentTerms: 'Payment Terms',
  thankYou: 'Thank you for your business!',

  // P&L
  profitAndLoss: 'Profit & Loss Statement',
  revenue: 'Revenue',
  expenses: 'Expenses',
  netIncome: 'Net Income',
  profitMargin: 'Profit Margin',
  summary: 'Summary',
  revenueBreakdown: 'Revenue Breakdown',
  expenseBreakdown: 'Expense Breakdown',
  count: 'Count',
};

/**
 * Get the array of English label values for batch translation.
 */
export function getPDFLabelValues(): string[] {
  return Object.values(DEFAULT_PDF_LABELS);
}

/**
 * Get the label keys in the same order as values.
 */
export function getPDFLabelKeys(): (keyof PDFLabels)[] {
  return Object.keys(DEFAULT_PDF_LABELS) as (keyof PDFLabels)[];
}

/**
 * Build a PDFLabels object from a translations map.
 */
export function buildTranslatedPDFLabels(translations: Record<string, string>): PDFLabels {
  const result = { ...DEFAULT_PDF_LABELS };
  for (const [key, englishValue] of Object.entries(DEFAULT_PDF_LABELS)) {
    if (translations[englishValue]) {
      (result as Record<string, string>)[key] = translations[englishValue];
    }
  }
  return result;
}

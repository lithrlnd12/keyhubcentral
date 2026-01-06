import * as admin from 'firebase-admin';
// Dynamic import to avoid deployment timeout
import type { sheets_v4 } from 'googleapis';

let sheetsClient: sheets_v4.Sheets | null = null;

// P&L Spreadsheet ID (separate from invoices)
function getPnLSpreadsheetId(): string {
  const id = process.env.GOOGLE_PNL_SPREADSHEET_ID;
  if (!id) {
    throw new Error('GOOGLE_PNL_SPREADSHEET_ID environment variable is not set');
  }
  return id;
}

async function getSheetsClient(): Promise<sheets_v4.Sheets> {
  if (sheetsClient) {
    return sheetsClient;
  }

  // Dynamic import to avoid deployment timeout
  const { google } = await import('googleapis');

  const serviceAccountKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountKey) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set');
  }

  const credentials = JSON.parse(serviceAccountKey);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

// Invoice interface (matches Firestore)
interface Invoice {
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid';
  from: { entity: string; name: string };
  to: { entity: string; name: string };
  total: number;
  createdAt: admin.firestore.Timestamp;
  paidAt: admin.firestore.Timestamp | null;
}

// Job interface (matches Firestore)
interface Job {
  status: string;
  costs: {
    materialActual: number;
    laborActual: number;
  };
}

// Expense interface (matches Firestore)
interface Expense {
  id?: string;
  entity: string;
  category: string;
  description: string;
  vendor?: string;
  amount: number;
  date: admin.firestore.Timestamp;
  receiptId?: string;
  receiptImageUrl?: string;
  createdByName: string;
}

interface EntityPnL {
  entity: string;
  entityName: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

// Get entity full name
function getEntityFullName(entity: string): string {
  switch (entity) {
    case 'kd': return 'Keynote Digital';
    case 'kts': return 'Key Trade Solutions';
    case 'kr': return 'Key Renovations';
    case 'customer': return 'Customers';
    case 'subscriber': return 'Subscribers';
    default: return entity;
  }
}

// Calculate P&L for an entity
function calculateEntityPnL(
  entity: string,
  invoices: Invoice[],
  jobs?: Job[],
  directExpenses?: Expense[]
): EntityPnL {
  let revenue = 0;
  let expenses = 0;

  // Revenue: Invoices FROM this entity that are paid
  invoices
    .filter((inv) => inv.from.entity === entity && inv.status === 'paid')
    .forEach((inv) => {
      revenue += inv.total;
    });

  // Expenses: Invoices TO this entity that are paid
  invoices
    .filter((inv) => inv.to.entity === entity && inv.status === 'paid')
    .forEach((inv) => {
      expenses += inv.total;
    });

  // For KR, also consider job material costs
  if (entity === 'kr' && jobs) {
    jobs
      .filter((job) => job.status === 'paid_in_full' || job.status === 'complete')
      .forEach((job) => {
        if (job.costs?.materialActual > 0) {
          expenses += job.costs.materialActual;
        }
      });
  }

  // Add direct expenses (from receipts, etc.)
  if (directExpenses) {
    directExpenses
      .filter((exp) => exp.entity === entity)
      .forEach((exp) => {
        expenses += exp.amount;
      });
  }

  return {
    entity,
    entityName: getEntityFullName(entity),
    revenue,
    expenses,
    netIncome: revenue - expenses,
  };
}

// Filter invoices by date range
function filterByDateRange(
  invoices: Invoice[],
  startDate: Date,
  endDate: Date
): Invoice[] {
  return invoices.filter((inv) => {
    const createdAt = inv.createdAt.toDate();
    return createdAt >= startDate && createdAt <= endDate;
  });
}

// Get date range presets
function getDateRanges(): { label: string; start: Date; end: Date }[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  return [
    {
      label: 'This Month',
      start: new Date(currentYear, currentMonth, 1),
      end: new Date(currentYear, currentMonth + 1, 0),
    },
    {
      label: 'Last Month',
      start: new Date(currentYear, currentMonth - 1, 1),
      end: new Date(currentYear, currentMonth, 0),
    },
    {
      label: 'This Quarter',
      start: new Date(currentYear, Math.floor(currentMonth / 3) * 3, 1),
      end: new Date(currentYear, Math.floor(currentMonth / 3) * 3 + 3, 0),
    },
    {
      label: 'This Year',
      start: new Date(currentYear, 0, 1),
      end: new Date(currentYear, 11, 31),
    },
    {
      label: 'Last Year',
      start: new Date(currentYear - 1, 0, 1),
      end: new Date(currentYear - 1, 11, 31),
    },
  ];
}

// Format date for sheets
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Helper to add delay between API calls
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rebuild the entire P&L spreadsheet
 */
export async function rebuildPnLSheet(): Promise<void> {
  const db = admin.firestore();
  const sheets = await getSheetsClient();
  const spreadsheetId = getPnLSpreadsheetId();

  console.log('Starting P&L sheet rebuild...');

  // Fetch all invoices, jobs, and expenses
  const [invoicesSnapshot, jobsSnapshot, expensesSnapshot] = await Promise.all([
    db.collection('invoices').get(),
    db.collection('jobs').get(),
    db.collection('expenses').get(),
  ]);

  const invoices = invoicesSnapshot.docs.map((doc) => doc.data() as Invoice);
  const jobs = jobsSnapshot.docs.map((doc) => doc.data() as Job);
  const expenses = expensesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Expense));

  console.log(`Loaded ${invoices.length} invoices, ${jobs.length} jobs, and ${expenses.length} expenses`);

  const dateRanges = getDateRanges();
  const entities = ['kd', 'kts', 'kr'];

  // Build Summary sheet data
  const summaryData: (string | number)[][] = [
    ['P&L Summary', '', '', '', '', '', 'Last Updated:', new Date().toLocaleString()],
    [],
    ['Period', 'Start Date', 'End Date', 'Total Revenue', 'Total Expenses', 'Net Income', 'Margin %'],
  ];

  for (const range of dateRanges) {
    const filtered = filterByDateRange(invoices, range.start, range.end);
    const filteredExpenses = expenses.filter((exp) => {
      const expDate = exp.date.toDate();
      return expDate >= range.start && expDate <= range.end;
    });
    let totalRevenue = 0;
    let totalExpenses = 0;
    let intercompany = 0;

    for (const entity of entities) {
      const pnl = calculateEntityPnL(entity, filtered, entity === 'kr' ? jobs : undefined, filteredExpenses);
      totalRevenue += pnl.revenue;
      totalExpenses += pnl.expenses;
    }

    // Calculate intercompany to eliminate
    filtered
      .filter((inv) => inv.status === 'paid')
      .forEach((inv) => {
        if (entities.includes(inv.from.entity) && entities.includes(inv.to.entity)) {
          intercompany += inv.total;
        }
      });

    const netRevenue = totalRevenue - intercompany;
    const netExpenses = totalExpenses - intercompany;
    const netIncome = netRevenue - netExpenses;
    const margin = netRevenue > 0 ? ((netIncome / netRevenue) * 100).toFixed(1) : '0.0';

    summaryData.push([
      range.label,
      formatDate(range.start),
      formatDate(range.end),
      netRevenue,
      netExpenses,
      netIncome,
      `${margin}%`,
    ]);
  }

  // Build Entity Breakdown sheet data
  const entityData: (string | number)[][] = [
    ['Entity Breakdown by Period', '', '', '', '', '', 'Last Updated:', new Date().toLocaleString()],
    [],
    ['Period', 'Entity', 'Revenue', 'Expenses', 'Net Income', 'Margin %'],
  ];

  for (const range of dateRanges) {
    const filtered = filterByDateRange(invoices, range.start, range.end);
    const filteredExpenses = expenses.filter((exp) => {
      const expDate = exp.date.toDate();
      return expDate >= range.start && expDate <= range.end;
    });

    for (const entity of entities) {
      const pnl = calculateEntityPnL(entity, filtered, entity === 'kr' ? jobs : undefined, filteredExpenses);
      const margin = pnl.revenue > 0 ? ((pnl.netIncome / pnl.revenue) * 100).toFixed(1) : '0.0';

      entityData.push([
        range.label,
        pnl.entityName,
        pnl.revenue,
        pnl.expenses,
        pnl.netIncome,
        `${margin}%`,
      ]);
    }
  }

  // Build Monthly Trend sheet (last 12 months)
  const trendData: (string | number)[][] = [
    ['Monthly P&L Trend', '', '', '', '', '', 'Last Updated:', new Date().toLocaleString()],
    [],
    ['Month', 'Keynote Digital', 'Key Trade Solutions', 'Key Renovations', 'Combined Net Income'],
  ];

  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    const filtered = filterByDateRange(invoices, monthStart, monthEnd);
    const monthExpenses = expenses.filter((exp) => {
      const expDate = exp.date.toDate();
      return expDate >= monthStart && expDate <= monthEnd;
    });
    const kdPnL = calculateEntityPnL('kd', filtered, undefined, monthExpenses);
    const ktsPnL = calculateEntityPnL('kts', filtered, undefined, monthExpenses);
    const krPnL = calculateEntityPnL('kr', filtered, jobs, monthExpenses);

    // Calculate intercompany
    let intercompany = 0;
    filtered
      .filter((inv) => inv.status === 'paid')
      .forEach((inv) => {
        if (entities.includes(inv.from.entity) && entities.includes(inv.to.entity)) {
          intercompany += inv.total;
        }
      });

    const combinedNet = kdPnL.netIncome + ktsPnL.netIncome + krPnL.netIncome;

    trendData.push([
      monthLabel,
      kdPnL.netIncome,
      ktsPnL.netIncome,
      krPnL.netIncome,
      combinedNet,
    ]);
  }

  // Build Materials & Expenses detail sheet
  const expensesData: (string | number)[][] = [
    ['Materials & Expenses Detail', '', '', '', '', '', '', 'Last Updated:', new Date().toLocaleString()],
    [],
    ['Date', 'Entity', 'Category', 'Vendor', 'Description', 'Amount', 'Added By', 'Receipt Link'],
  ];

  // Sort expenses by date descending
  const sortedExpenses = [...expenses].sort((a, b) => b.date.toMillis() - a.date.toMillis());

  for (const exp of sortedExpenses) {
    const categoryLabel = exp.category.charAt(0).toUpperCase() + exp.category.slice(1);
    expensesData.push([
      exp.date.toDate().toLocaleDateString('en-US'),
      getEntityFullName(exp.entity),
      categoryLabel,
      exp.vendor || '',
      exp.description,
      exp.amount,
      exp.createdByName,
      exp.receiptImageUrl || '',
    ]);
  }

  // Write all sheets
  console.log('Writing Summary sheet...');
  await writeSheet(sheets, spreadsheetId, 'Summary', summaryData);
  await delay(1000);

  console.log('Writing Entity Breakdown sheet...');
  await writeSheet(sheets, spreadsheetId, 'Entity Breakdown', entityData);
  await delay(1000);

  console.log('Writing Monthly Trend sheet...');
  await writeSheet(sheets, spreadsheetId, 'Monthly Trend', trendData);
  await delay(1000);

  console.log('Writing Materials & Expenses sheet...');
  await writeSheet(sheets, spreadsheetId, 'Materials & Expenses', expensesData);
  await delay(1000);

  // Format sheets
  console.log('Formatting sheets...');
  await formatPnLSheets(sheets, spreadsheetId);

  console.log('P&L sheet rebuild complete!');
}

// Write data to a sheet tab
async function writeSheet(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  sheetName: string,
  data: (string | number)[][]
): Promise<void> {
  // Get or create sheet
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
  const existingSheet = spreadsheet.data.sheets?.find(
    (s) => s.properties?.title === sheetName
  );

  if (!existingSheet) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
    await delay(500);
  }

  // Clear and write
  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  if (data.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: data },
    });
  }
}

// Format P&L sheets with professional styling
async function formatPnLSheets(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string
): Promise<void> {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });

  for (const sheet of spreadsheet.data.sheets || []) {
    const sheetId = sheet.properties?.sheetId;
    const sheetTitle = sheet.properties?.title;
    if (sheetId == null) continue;

    const requests: sheets_v4.Schema$Request[] = [
      // Title styling (row 1) - Gold color, large bold
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true, fontSize: 16, foregroundColor: { red: 0.83, green: 0.66, blue: 0.29 } },
            },
          },
          fields: 'userEnteredFormat.textFormat',
        },
      },
      // "Last Updated" label styling
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 6, endColumnIndex: 8 },
          cell: {
            userEnteredFormat: {
              textFormat: { italic: true, fontSize: 10, foregroundColor: { red: 0.6, green: 0.6, blue: 0.6 } },
            },
          },
          fields: 'userEnteredFormat.textFormat',
        },
      },
      // Header row styling (row 3) - Dark background, white bold text
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 2, endRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.1, green: 0.1, blue: 0.1 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
              horizontalAlignment: 'CENTER',
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
        },
      },
      // Freeze header rows
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 3 } },
          fields: 'gridProperties.frozenRowCount',
        },
      },
      // Auto-resize columns
      {
        autoResizeDimensions: {
          dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 10 },
        },
      },
    ];

    // Add currency formatting based on sheet type
    if (sheetTitle === 'Summary') {
      // Revenue column (D) - green currency
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 3, endColumnIndex: 4, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
              textFormat: { foregroundColor: { red: 0.2, green: 0.7, blue: 0.2 } },
            },
          },
          fields: 'userEnteredFormat(numberFormat,textFormat)',
        },
      });
      // Expenses column (E) - red currency
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 4, endColumnIndex: 5, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
              textFormat: { foregroundColor: { red: 0.9, green: 0.3, blue: 0.3 } },
            },
          },
          fields: 'userEnteredFormat(numberFormat,textFormat)',
        },
      });
      // Net Income column (F) - bold currency
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 5, endColumnIndex: 6, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
              textFormat: { bold: true },
            },
          },
          fields: 'userEnteredFormat(numberFormat,textFormat)',
        },
      });
      // Conditional formatting for Net Income - green if positive, red if negative
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startColumnIndex: 5, endColumnIndex: 6, startRowIndex: 3 }],
            booleanRule: {
              condition: { type: 'NUMBER_GREATER', values: [{ userEnteredValue: '0' }] },
              format: { textFormat: { foregroundColor: { red: 0.2, green: 0.7, blue: 0.2 } } },
            },
          },
          index: 0,
        },
      });
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startColumnIndex: 5, endColumnIndex: 6, startRowIndex: 3 }],
            booleanRule: {
              condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
              format: { textFormat: { foregroundColor: { red: 0.9, green: 0.3, blue: 0.3 } } },
            },
          },
          index: 1,
        },
      });
    }

    if (sheetTitle === 'Entity Breakdown') {
      // Revenue column (C)
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 2, endColumnIndex: 3, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
              textFormat: { foregroundColor: { red: 0.2, green: 0.7, blue: 0.2 } },
            },
          },
          fields: 'userEnteredFormat(numberFormat,textFormat)',
        },
      });
      // Expenses column (D)
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 3, endColumnIndex: 4, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
              textFormat: { foregroundColor: { red: 0.9, green: 0.3, blue: 0.3 } },
            },
          },
          fields: 'userEnteredFormat(numberFormat,textFormat)',
        },
      });
      // Net Income column (E)
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 4, endColumnIndex: 5, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
              textFormat: { bold: true },
            },
          },
          fields: 'userEnteredFormat(numberFormat,textFormat)',
        },
      });
      // Conditional formatting for Net Income
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startColumnIndex: 4, endColumnIndex: 5, startRowIndex: 3 }],
            booleanRule: {
              condition: { type: 'NUMBER_GREATER', values: [{ userEnteredValue: '0' }] },
              format: { textFormat: { foregroundColor: { red: 0.2, green: 0.7, blue: 0.2 } } },
            },
          },
          index: 0,
        },
      });
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startColumnIndex: 4, endColumnIndex: 5, startRowIndex: 3 }],
            booleanRule: {
              condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
              format: { textFormat: { foregroundColor: { red: 0.9, green: 0.3, blue: 0.3 } } },
            },
          },
          index: 1,
        },
      });
      // Alternating row colors for readability
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: 3 }],
            booleanRule: {
              condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: '=MOD(ROW(),2)=0' }] },
              format: { backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 } },
            },
          },
          index: 2,
        },
      });
    }

    if (sheetTitle === 'Monthly Trend') {
      // Currency formatting for all value columns (B-E)
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 1, endColumnIndex: 5, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
            },
          },
          fields: 'userEnteredFormat.numberFormat',
        },
      });
      // Conditional formatting for all values - green positive, red negative
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startColumnIndex: 1, endColumnIndex: 5, startRowIndex: 3 }],
            booleanRule: {
              condition: { type: 'NUMBER_GREATER', values: [{ userEnteredValue: '0' }] },
              format: { textFormat: { foregroundColor: { red: 0.2, green: 0.7, blue: 0.2 } } },
            },
          },
          index: 0,
        },
      });
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startColumnIndex: 1, endColumnIndex: 5, startRowIndex: 3 }],
            booleanRule: {
              condition: { type: 'NUMBER_LESS', values: [{ userEnteredValue: '0' }] },
              format: { textFormat: { foregroundColor: { red: 0.9, green: 0.3, blue: 0.3 } } },
            },
          },
          index: 1,
        },
      });
      // Combined column bold
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 4, endColumnIndex: 5, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
            },
          },
          fields: 'userEnteredFormat.textFormat',
        },
      });
    }

    if (sheetTitle === 'Materials & Expenses') {
      // Amount column (F) - currency format, red color
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 5, endColumnIndex: 6, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
              textFormat: { foregroundColor: { red: 0.9, green: 0.3, blue: 0.3 } },
            },
          },
          fields: 'userEnteredFormat(numberFormat,textFormat)',
        },
      });
      // Receipt Link column (H) - make it a hyperlink if URL present
      requests.push({
        repeatCell: {
          range: { sheetId, startColumnIndex: 7, endColumnIndex: 8, startRowIndex: 3 },
          cell: {
            userEnteredFormat: {
              textFormat: { foregroundColor: { red: 0.2, green: 0.4, blue: 0.8 }, underline: true },
            },
          },
          fields: 'userEnteredFormat.textFormat',
        },
      });
      // Alternating row colors for readability
      requests.push({
        addConditionalFormatRule: {
          rule: {
            ranges: [{ sheetId, startRowIndex: 3 }],
            booleanRule: {
              condition: { type: 'CUSTOM_FORMULA', values: [{ userEnteredValue: '=MOD(ROW(),2)=0' }] },
              format: { backgroundColor: { red: 0.95, green: 0.95, blue: 0.95 } },
            },
          },
          index: 0,
        },
      });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests },
    });

    await delay(500);
  }
}

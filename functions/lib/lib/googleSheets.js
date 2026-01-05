"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSheetsClient = getSheetsClient;
exports.getSpreadsheetId = getSpreadsheetId;
exports.getOrCreateSheet = getOrCreateSheet;
exports.clearSheet = clearSheet;
exports.writeToSheet = writeToSheet;
exports.appendToSheet = appendToSheet;
exports.updateRowByInvoiceNumber = updateRowByInvoiceNumber;
exports.deleteRowByInvoiceNumber = deleteRowByInvoiceNumber;
exports.formatHeaderRow = formatHeaderRow;
let sheetsClient = null;
/**
 * Get authenticated Google Sheets client (async to support dynamic import)
 */
async function getSheetsClient() {
    if (sheetsClient) {
        return sheetsClient;
    }
    // Dynamic import to avoid deployment timeout
    const { google } = await Promise.resolve().then(() => require('googleapis'));
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
/**
 * Get the spreadsheet ID from environment
 */
function getSpreadsheetId() {
    const id = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
    if (!id) {
        throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID environment variable is not set');
    }
    return id;
}
/**
 * Get or create a sheet tab by name
 */
async function getOrCreateSheet(sheetName) {
    var _a, _b, _c, _d, _e, _f;
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    // Get all sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
    const existingSheet = (_a = spreadsheet.data.sheets) === null || _a === void 0 ? void 0 : _a.find((s) => { var _a; return ((_a = s.properties) === null || _a === void 0 ? void 0 : _a.title) === sheetName; });
    if (((_b = existingSheet === null || existingSheet === void 0 ? void 0 : existingSheet.properties) === null || _b === void 0 ? void 0 : _b.sheetId) != null) {
        return existingSheet.properties.sheetId;
    }
    // Create new sheet
    const response = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    addSheet: {
                        properties: { title: sheetName },
                    },
                },
            ],
        },
    });
    const newSheetId = (_f = (_e = (_d = (_c = response.data.replies) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.addSheet) === null || _e === void 0 ? void 0 : _e.properties) === null || _f === void 0 ? void 0 : _f.sheetId;
    if (newSheetId == null) {
        throw new Error(`Failed to create sheet: ${sheetName}`);
    }
    return newSheetId;
}
/**
 * Clear all data from a sheet
 */
async function clearSheet(sheetName) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: `${sheetName}!A:Z`,
    });
}
/**
 * Write data to a sheet (replaces all existing data)
 */
async function writeToSheet(sheetName, data) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    // Ensure sheet exists
    await getOrCreateSheet(sheetName);
    // Clear existing data
    await clearSheet(sheetName);
    // Write new data
    if (data.length > 0) {
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${sheetName}!A1`,
            valueInputOption: 'USER_ENTERED',
            requestBody: { values: data },
        });
    }
}
/**
 * Append a row to a sheet
 */
async function appendToSheet(sheetName, row) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:A`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
    });
}
/**
 * Find and update a row by invoice number
 */
async function updateRowByInvoiceNumber(sheetName, invoiceNumber, newRow) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    // Get all data
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
    });
    const values = response.data.values || [];
    const rowIndex = values.findIndex((row) => row[0] === invoiceNumber);
    if (rowIndex === -1) {
        return false;
    }
    // Update the row (rowIndex + 1 because sheets are 1-indexed)
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [newRow] },
    });
    return true;
}
/**
 * Delete a row by invoice number
 */
async function deleteRowByInvoiceNumber(sheetName, invoiceNumber) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    // Get all data
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A:A`,
    });
    const values = response.data.values || [];
    const rowIndex = values.findIndex((row) => row[0] === invoiceNumber);
    if (rowIndex === -1) {
        return false;
    }
    // Get sheet ID
    const sheetId = await getOrCreateSheet(sheetName);
    // Delete the row
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [
                {
                    deleteDimension: {
                        range: {
                            sheetId,
                            dimension: 'ROWS',
                            startIndex: rowIndex,
                            endIndex: rowIndex + 1,
                        },
                    },
                },
            ],
        },
    });
    return true;
}
/**
 * Format sheet with professional styling
 */
async function formatHeaderRow(sheetName) {
    const sheets = await getSheetsClient();
    const spreadsheetId = getSpreadsheetId();
    const sheetId = await getOrCreateSheet(sheetName);
    // Column indices (0-based):
    // 0=Invoice#, 1=Status, 2=FromEntity, 3=FromName, 4=ToEntity, 5=ToName,
    // 6=Subtotal, 7=Discount, 8=Total, 9=DueDate, 10=DaysUntilDue, 11=SentDate, 12=PaidDate, 13=CreatedDate
    const requests = [
        // Header row: dark background, white bold text
        {
            repeatCell: {
                range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                    userEnteredFormat: {
                        backgroundColor: { red: 0.2, green: 0.2, blue: 0.2 },
                        textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
                        horizontalAlignment: 'CENTER',
                    },
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
            },
        },
        // Freeze header row
        {
            updateSheetProperties: {
                properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
                fields: 'gridProperties.frozenRowCount',
            },
        },
        // Currency format for Subtotal (col 6)
        {
            repeatCell: {
                range: { sheetId, startColumnIndex: 6, endColumnIndex: 7, startRowIndex: 1 },
                cell: {
                    userEnteredFormat: {
                        numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
                    },
                },
                fields: 'userEnteredFormat.numberFormat',
            },
        },
        // Currency format for Discount (col 7)
        {
            repeatCell: {
                range: { sheetId, startColumnIndex: 7, endColumnIndex: 8, startRowIndex: 1 },
                cell: {
                    userEnteredFormat: {
                        numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
                    },
                },
                fields: 'userEnteredFormat.numberFormat',
            },
        },
        // Currency format for Total (col 8) - bold
        {
            repeatCell: {
                range: { sheetId, startColumnIndex: 8, endColumnIndex: 9, startRowIndex: 1 },
                cell: {
                    userEnteredFormat: {
                        numberFormat: { type: 'CURRENCY', pattern: '"$"#,##0.00' },
                        textFormat: { bold: true },
                    },
                },
                fields: 'userEnteredFormat(numberFormat,textFormat)',
            },
        },
        // Auto-resize columns
        {
            autoResizeDimensions: {
                dimensions: { sheetId, dimension: 'COLUMNS', startIndex: 0, endIndex: 14 },
            },
        },
        // Add conditional formatting: green for PAID status
        {
            addConditionalFormatRule: {
                rule: {
                    ranges: [{ sheetId, startRowIndex: 1 }],
                    booleanRule: {
                        condition: {
                            type: 'TEXT_EQ',
                            values: [{ userEnteredValue: 'PAID' }],
                        },
                        format: {
                            backgroundColor: { red: 0.85, green: 0.95, blue: 0.85 },
                        },
                    },
                },
                index: 0,
            },
        },
        // Add conditional formatting: red for overdue (negative days)
        {
            addConditionalFormatRule: {
                rule: {
                    ranges: [{ sheetId, startColumnIndex: 10, endColumnIndex: 11, startRowIndex: 1 }],
                    booleanRule: {
                        condition: {
                            type: 'NUMBER_LESS',
                            values: [{ userEnteredValue: '0' }],
                        },
                        format: {
                            backgroundColor: { red: 1, green: 0.85, blue: 0.85 },
                            textFormat: { foregroundColor: { red: 0.8, green: 0, blue: 0 }, bold: true },
                        },
                    },
                },
                index: 1,
            },
        },
        // Yellow for SENT status
        {
            addConditionalFormatRule: {
                rule: {
                    ranges: [{ sheetId, startRowIndex: 1 }],
                    booleanRule: {
                        condition: {
                            type: 'TEXT_EQ',
                            values: [{ userEnteredValue: 'SENT' }],
                        },
                        format: {
                            backgroundColor: { red: 1, green: 0.95, blue: 0.8 },
                        },
                    },
                },
                index: 2,
            },
        },
    ];
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
    });
}
//# sourceMappingURL=googleSheets.js.map
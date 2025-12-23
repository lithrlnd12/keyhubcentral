/**
 * CSV utility functions for data export
 */

/**
 * Escape a value for CSV format
 * Wraps in quotes if contains comma, quote, or newline
 */
function escapeCSVValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Convert an array of objects to CSV string
 */
export function generateCSV<T>(
  data: T[],
  columns: { key: string; header: string; formatter?: (row: T) => string | number }[]
): string {
  if (data.length === 0) {
    return columns.map((col) => col.header).join(',');
  }

  // Generate header row
  const headerRow = columns.map((col) => escapeCSVValue(col.header)).join(',');

  // Generate data rows
  const dataRows = data.map((row) => {
    return columns
      .map((col) => {
        if (col.formatter) {
          return escapeCSVValue(col.formatter(row));
        }
        const value = row[col.key as keyof T];
        return escapeCSVValue(value as string | number | null | undefined);
      })
      .join(',');
  });

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger a CSV file download in the browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate filename with current date
 */
export function generateCSVFilename(prefix: string): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `${prefix}-${date}.csv`;
}

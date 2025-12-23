/**
 * PDF utility functions for generating exports
 */

/**
 * Generate a filename for P&L PDF export
 * Format: PnL-{Entity}-{Period}.pdf
 * Example: PnL-KeyRenovations-ThisMonth.pdf
 */
export function generatePnLFilename(
  entityKey: 'all' | 'kd' | 'kts' | 'kr',
  datePresetLabel: string
): string {
  const entityNames: Record<string, string> = {
    all: 'Combined',
    kd: 'KeynoteDigital',
    kts: 'KeyTradeSolutions',
    kr: 'KeyRenovations',
  };

  const entityName = entityNames[entityKey] || 'Report';

  // Clean up period string for filename (remove spaces)
  const period = datePresetLabel.replace(/\s+/g, '');

  return `PnL-${entityName}-${period}.pdf`;
}

/**
 * Format date range for display in PDF
 */
export function formatDateRangeForPdf(start: Date, end: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
}

/**
 * Format currency for PDF display
 */
export function formatPdfCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

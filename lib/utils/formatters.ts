export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return phone;
}

/**
 * Extract digits from a phone number for use in tel: links.
 * Handles various formats: (555) 123-4567, 555.123.4567, 555-123-4567, etc.
 * Returns the number with country code prefix if 10 digits (assumes US).
 */
export function getPhoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // If 10 digits, add US country code
  if (digits.length === 10) {
    return `tel:+1${digits}`;
  }
  // If 11 digits starting with 1, it's already US format
  if (digits.length === 11 && digits.startsWith('1')) {
    return `tel:+${digits}`;
  }
  // Otherwise just return what we have
  return `tel:${digits}`;
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatJobNumber(number: number): string {
  return `JOB-${number.toString().padStart(6, '0')}`;
}

export function formatInvoiceNumber(number: number): string {
  return `INV-${number.toString().padStart(6, '0')}`;
}

export function formatLeadId(number: number): string {
  return `LEAD-${number.toString().padStart(6, '0')}`;
}

export function formatTicketNumber(number: number): string {
  return `TKT-${number.toString().padStart(6, '0')}`;
}

export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 4) return `${diffWeeks}w ago`;
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return formatDate(date);
}

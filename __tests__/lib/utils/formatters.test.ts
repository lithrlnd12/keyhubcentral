import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
  formatPercentage,
  formatJobNumber,
  formatInvoiceNumber,
  formatLeadId,
  formatTicketNumber,
} from '@/lib/utils/formatters';

describe('formatCurrency', () => {
  it('formats positive numbers', () => {
    expect(formatCurrency(1234.56)).toBe('$1,234.56');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formats negative numbers', () => {
    expect(formatCurrency(-500)).toBe('-$500.00');
  });

  it('formats large numbers with commas', () => {
    expect(formatCurrency(1000000)).toBe('$1,000,000.00');
  });

  it('rounds to two decimal places', () => {
    expect(formatCurrency(99.999)).toBe('$100.00');
  });
});

describe('formatDate', () => {
  it('formats Date object', () => {
    const date = new Date('2024-03-15');
    expect(formatDate(date)).toMatch(/Mar 15, 2024/);
  });

  it('formats date string', () => {
    expect(formatDate('2024-12-25')).toMatch(/Dec 25, 2024/);
  });
});

describe('formatDateTime', () => {
  it('includes time', () => {
    const date = new Date('2024-03-15T14:30:00');
    const formatted = formatDateTime(date);
    expect(formatted).toMatch(/Mar 15, 2024/);
    expect(formatted).toMatch(/2:30/);
  });
});

describe('formatPhone', () => {
  it('formats 10-digit phone numbers', () => {
    expect(formatPhone('5551234567')).toBe('(555) 123-4567');
  });

  it('formats phone numbers with existing formatting', () => {
    expect(formatPhone('555-123-4567')).toBe('(555) 123-4567');
  });

  it('returns original if not valid format', () => {
    expect(formatPhone('123')).toBe('123');
  });

  it('returns original for phone with country code (not 10 digits)', () => {
    // formatPhone only handles 10-digit US phone numbers
    expect(formatPhone('+1 555 123 4567')).toBe('+1 555 123 4567');
  });
});

describe('formatPercentage', () => {
  it('formats decimal to percentage', () => {
    expect(formatPercentage(0.5)).toBe('50.0%');
  });

  it('respects decimal places parameter', () => {
    expect(formatPercentage(0.3333, 2)).toBe('33.33%');
  });

  it('handles zero', () => {
    expect(formatPercentage(0)).toBe('0.0%');
  });

  it('handles 100%', () => {
    expect(formatPercentage(1)).toBe('100.0%');
  });
});

describe('formatJobNumber', () => {
  it('pads with zeros', () => {
    expect(formatJobNumber(1)).toBe('JOB-000001');
    expect(formatJobNumber(123)).toBe('JOB-000123');
  });

  it('handles large numbers', () => {
    expect(formatJobNumber(999999)).toBe('JOB-999999');
  });
});

describe('formatInvoiceNumber', () => {
  it('pads with zeros', () => {
    expect(formatInvoiceNumber(1)).toBe('INV-000001');
    expect(formatInvoiceNumber(42)).toBe('INV-000042');
  });
});

describe('formatLeadId', () => {
  it('pads with zeros', () => {
    expect(formatLeadId(1)).toBe('LEAD-000001');
    expect(formatLeadId(500)).toBe('LEAD-000500');
  });
});

describe('formatTicketNumber', () => {
  it('pads with zeros', () => {
    expect(formatTicketNumber(1)).toBe('TKT-000001');
    expect(formatTicketNumber(12345)).toBe('TKT-012345');
  });
});

import { Timestamp } from 'firebase/firestore';
import { Invoice, InvoiceStatus, InvoiceEntity, NET_TERMS_DAYS } from '@/types/invoice';

// Status display config
export const INVOICE_STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: 'Draft', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  sent: { label: 'Sent', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  paid: { label: 'Paid', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  overdue: { label: 'Overdue', color: 'text-red-400', bgColor: 'bg-red-500/20' },
};

// Entity display config
export const ENTITY_CONFIG: Record<
  InvoiceEntity['entity'],
  { label: string; shortLabel: string; color: string }
> = {
  kd: { label: 'Keynote Digital', shortLabel: 'KD', color: 'text-purple-400' },
  kts: { label: 'Key Trade Solutions', shortLabel: 'KTS', color: 'text-blue-400' },
  kr: { label: 'Key Renovations', shortLabel: 'KR', color: 'text-green-400' },
  customer: { label: 'Customer', shortLabel: 'Customer', color: 'text-gray-400' },
  subscriber: { label: 'Subscriber', shortLabel: 'Subscriber', color: 'text-amber-400' },
};

// Format entity name
export function formatEntityName(entity: InvoiceEntity): string {
  if (entity.name) return entity.name;
  return ENTITY_CONFIG[entity.entity].label;
}

// Format invoice date
export function formatInvoiceDate(timestamp: Timestamp | Date | null | undefined): string {
  if (!timestamp) return '-';
  let date: Date | null = null;
  if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp.toDate === 'function') {
    date = timestamp.toDate();
  }
  if (!date) return '-';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Helper to safely convert Timestamp to Date
function toDate(timestamp: Timestamp | Date | null | undefined): Date | null {
  if (!timestamp) return null;
  if (timestamp instanceof Date) return timestamp;
  if (typeof timestamp.toDate === 'function') return timestamp.toDate();
  return null;
}

// Get days until due / days overdue
export function getDaysUntilDue(invoice: Invoice): number | null {
  if (invoice.status === 'paid') return null;
  if (!invoice.dueDate) return null;
  const now = new Date();
  const dueDate = toDate(invoice.dueDate);
  if (!dueDate) return null;
  const diffTime = dueDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Check if invoice is overdue
export function isOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid') return false;
  const daysUntil = getDaysUntilDue(invoice);
  return daysUntil !== null && daysUntil < 0;
}

// Get invoice type based on from/to entities
export function getInvoiceType(invoice: Invoice): string {
  const from = invoice.from.entity;
  const to = invoice.to.entity;

  if (from === 'kd' && to === 'kr') return 'Lead Fee';
  if (from === 'kts' && to === 'kr') return 'Labor & Commission';
  if (from === 'kr' && to === 'customer') return 'Customer Invoice';
  if (from === 'kd' && to === 'subscriber') return 'Subscription';

  return 'Invoice';
}

// Calculate invoice age in days
export function getInvoiceAge(invoice: Invoice): number {
  if (!invoice.createdAt) return 0;
  const createdDate = toDate(invoice.createdAt);
  if (!createdDate) return 0;
  const now = new Date();
  const diffTime = now.getTime() - createdDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Format due date with status indicator
export function formatDueDateWithStatus(invoice: Invoice): {
  text: string;
  color: string;
} {
  if (invoice.status === 'paid') {
    return { text: 'Paid', color: 'text-green-400' };
  }

  const daysUntil = getDaysUntilDue(invoice);
  if (daysUntil === null) {
    return { text: '-', color: 'text-gray-400' };
  }

  if (daysUntil < 0) {
    return {
      text: `${Math.abs(daysUntil)} days overdue`,
      color: 'text-red-400',
    };
  }

  if (daysUntil === 0) {
    return { text: 'Due today', color: 'text-yellow-400' };
  }

  if (daysUntil <= 7) {
    return { text: `Due in ${daysUntil} days`, color: 'text-yellow-400' };
  }

  return { text: formatInvoiceDate(invoice.dueDate), color: 'text-gray-400' };
}

// Sort invoices by priority (overdue first, then by due date)
export function sortInvoicesByPriority(invoices: Invoice[]): Invoice[] {
  return [...invoices].sort((a, b) => {
    // Paid invoices go last
    if (a.status === 'paid' && b.status !== 'paid') return 1;
    if (a.status !== 'paid' && b.status === 'paid') return -1;

    // Overdue invoices first
    const aOverdue = isOverdue(a);
    const bOverdue = isOverdue(b);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then by due date (earliest first)
    const aDueDate = toDate(a.dueDate);
    const bDueDate = toDate(b.dueDate);
    if (!aDueDate || !bDueDate) return 0;
    return aDueDate.getTime() - bDueDate.getTime();
  });
}

// Group invoices by status
export function groupInvoicesByStatus(
  invoices: Invoice[]
): Record<InvoiceStatus, Invoice[]> {
  const grouped: Record<InvoiceStatus, Invoice[]> = {
    draft: [],
    sent: [],
    paid: [],
    overdue: [],
  };

  invoices.forEach((invoice) => {
    // Auto-detect overdue status
    if (invoice.status !== 'paid' && isOverdue(invoice)) {
      grouped.overdue.push(invoice);
    } else {
      grouped[invoice.status].push(invoice);
    }
  });

  return grouped;
}

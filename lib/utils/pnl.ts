import { Invoice, InvoiceEntity } from '@/types/invoice';
import { Job } from '@/types/job';
import { Timestamp } from 'firebase/firestore';

export interface PnLEntry {
  category: string;
  amount: number;
  type: 'revenue' | 'expense';
}

export interface EntityPnL {
  entity: InvoiceEntity['entity'];
  entityName: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  entries: PnLEntry[];
}

export interface CombinedPnL {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  intercompanyRevenue: number;
  intercompanyExpenses: number;
  entities: EntityPnL[];
}

// Get entity full name
export function getEntityFullName(entity: InvoiceEntity['entity']): string {
  switch (entity) {
    case 'kd':
      return 'Keynote Digital';
    case 'kts':
      return 'Key Trade Solutions';
    case 'kr':
      return 'Key Renovations';
    case 'customer':
      return 'Customers';
    case 'subscriber':
      return 'Subscribers';
    default:
      return entity;
  }
}

// Calculate P&L for a single entity
export function calculateEntityPnL(
  entity: InvoiceEntity['entity'],
  invoices: Invoice[],
  jobs?: Job[]
): EntityPnL {
  const entries: PnLEntry[] = [];
  let revenue = 0;
  let expenses = 0;

  // Revenue: Invoices FROM this entity that are paid
  const revenueInvoices = invoices.filter(
    (inv) => inv.from.entity === entity && inv.status === 'paid'
  );

  revenueInvoices.forEach((inv) => {
    const category = getCategoryFromInvoice(inv);
    entries.push({
      category,
      amount: inv.total,
      type: 'revenue',
    });
    revenue += inv.total;
  });

  // Expenses: Invoices TO this entity that are paid
  const expenseInvoices = invoices.filter(
    (inv) => inv.to.entity === entity && inv.status === 'paid'
  );

  expenseInvoices.forEach((inv) => {
    const category = getCategoryFromInvoice(inv);
    entries.push({
      category,
      amount: inv.total,
      type: 'expense',
    });
    expenses += inv.total;
  });

  // For KR, also consider job costs
  if (entity === 'kr' && jobs) {
    const completedJobs = jobs.filter(
      (job) => job.status === 'paid_in_full' || job.status === 'complete'
    );

    completedJobs.forEach((job) => {
      if (job.costs.materialActual > 0) {
        entries.push({
          category: 'Materials',
          amount: job.costs.materialActual,
          type: 'expense',
        });
        expenses += job.costs.materialActual;
      }
    });
  }

  return {
    entity,
    entityName: getEntityFullName(entity),
    revenue,
    expenses,
    netIncome: revenue - expenses,
    entries,
  };
}

// Calculate combined P&L
export function calculateCombinedPnL(invoices: Invoice[], jobs?: Job[]): CombinedPnL {
  const entities: EntityPnL[] = [];
  const internalEntities: InvoiceEntity['entity'][] = ['kd', 'kts', 'kr'];

  // Calculate P&L for each internal entity
  internalEntities.forEach((entity) => {
    const entityPnL = calculateEntityPnL(entity, invoices, entity === 'kr' ? jobs : undefined);
    entities.push(entityPnL);
  });

  // Calculate intercompany transactions (to net them out)
  let intercompanyRevenue = 0;
  let intercompanyExpenses = 0;

  invoices
    .filter((inv) => inv.status === 'paid')
    .forEach((inv) => {
      const fromInternal = internalEntities.includes(inv.from.entity);
      const toInternal = internalEntities.includes(inv.to.entity);

      if (fromInternal && toInternal) {
        // This is an intercompany transaction
        intercompanyRevenue += inv.total;
        intercompanyExpenses += inv.total;
      }
    });

  // Calculate consolidated totals
  const totalRevenue = entities.reduce((sum, e) => sum + e.revenue, 0);
  const totalExpenses = entities.reduce((sum, e) => sum + e.expenses, 0);

  // Net income is total revenue minus expenses, but intercompany cancels out
  const netIncome = totalRevenue - totalExpenses;

  return {
    totalRevenue,
    totalExpenses,
    netIncome,
    intercompanyRevenue,
    intercompanyExpenses,
    entities,
  };
}

// Get category label from invoice
function getCategoryFromInvoice(invoice: Invoice): string {
  const from = invoice.from.entity;
  const to = invoice.to.entity;

  if (from === 'kd' && to === 'kr') return 'Lead Fees';
  if (from === 'kd' && to === 'subscriber') return 'Subscription Revenue';
  if (from === 'kts' && to === 'kr') return 'Labor & Commissions';
  if (from === 'kr' && to === 'customer') return 'Job Revenue';

  return 'Other';
}

// Group entries by category
export function groupEntriesByCategory(
  entries: PnLEntry[]
): Record<string, { revenue: number; expense: number }> {
  const grouped: Record<string, { revenue: number; expense: number }> = {};

  entries.forEach((entry) => {
    if (!grouped[entry.category]) {
      grouped[entry.category] = { revenue: 0, expense: 0 };
    }

    if (entry.type === 'revenue') {
      grouped[entry.category].revenue += entry.amount;
    } else {
      grouped[entry.category].expense += entry.amount;
    }
  });

  return grouped;
}

// Filter invoices by date range
export function filterInvoicesByDateRange(
  invoices: Invoice[],
  startDate: Date,
  endDate: Date
): Invoice[] {
  const startTimestamp = Timestamp.fromDate(startDate);
  const endTimestamp = Timestamp.fromDate(endDate);

  return invoices.filter((inv) => {
    const createdAt = inv.createdAt.toMillis();
    return createdAt >= startTimestamp.toMillis() && createdAt <= endTimestamp.toMillis();
  });
}

// Get date range presets
export function getDateRangePresets(): { label: string; start: Date; end: Date }[] {
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

// Calculate profit margin percentage
export function calculateProfitMargin(revenue: number, expenses: number): number {
  if (revenue === 0) return 0;
  return ((revenue - expenses) / revenue) * 100;
}

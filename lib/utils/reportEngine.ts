import { Job } from '@/types/job';
import { Lead, Campaign } from '@/types/lead';
import { Invoice } from '@/types/invoice';
import { Contractor } from '@/types/contractor';
import {
  MetricSource,
  MetricSelection,
  ReportConfig,
  ReportResult,
  ReportFilter,
  GroupBy,
  Aggregation,
} from '@/types/report';

// ==============================
// Metric Catalog
// ==============================

export interface MetricDefinition {
  field: string;
  label: string;
  aggregation: Aggregation;
  format: 'number' | 'currency' | 'percent' | 'days';
}

export interface MetricCatalog {
  jobs: MetricDefinition[];
  leads: MetricDefinition[];
  campaigns: MetricDefinition[];
  invoices: MetricDefinition[];
  contractors: MetricDefinition[];
}

export function getAvailableMetrics(): MetricCatalog {
  return {
    jobs: [
      { field: 'count', label: 'Job Count', aggregation: 'count', format: 'number' },
      { field: 'totalRevenue', label: 'Total Revenue', aggregation: 'sum', format: 'currency' },
      { field: 'avgJobValue', label: 'Avg Job Value', aggregation: 'avg', format: 'currency' },
      { field: 'completionRate', label: 'Completion Rate', aggregation: 'avg', format: 'percent' },
      { field: 'avgDaysToComplete', label: 'Avg Days to Complete', aggregation: 'avg', format: 'days' },
    ],
    leads: [
      { field: 'count', label: 'Lead Count', aggregation: 'count', format: 'number' },
      { field: 'conversionRate', label: 'Conversion Rate', aggregation: 'avg', format: 'percent' },
      { field: 'avgTimeToConvert', label: 'Avg Time to Convert (days)', aggregation: 'avg', format: 'days' },
    ],
    campaigns: [
      { field: 'totalSpend', label: 'Total Spend', aggregation: 'sum', format: 'currency' },
      { field: 'avgCPL', label: 'Avg Cost per Lead', aggregation: 'avg', format: 'currency' },
      { field: 'avgROI', label: 'Avg ROI', aggregation: 'avg', format: 'percent' },
    ],
    invoices: [
      { field: 'totalBilled', label: 'Total Billed', aggregation: 'sum', format: 'currency' },
      { field: 'totalPaid', label: 'Total Paid', aggregation: 'sum', format: 'currency' },
      { field: 'totalOverdue', label: 'Total Overdue', aggregation: 'sum', format: 'currency' },
      { field: 'avgDaysToPay', label: 'Avg Days to Pay', aggregation: 'avg', format: 'days' },
    ],
    contractors: [
      { field: 'activeCount', label: 'Active Contractors', aggregation: 'count', format: 'number' },
      { field: 'avgRating', label: 'Avg Rating', aggregation: 'avg', format: 'number' },
    ],
  };
}

// ==============================
// Helpers
// ==============================

/** Safe conversion of Firestore Timestamp or Date to Date */
function toDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof (val as { toDate?: unknown }).toDate === 'function') {
    return (val as { toDate: () => Date }).toDate();
  }
  return null;
}

/** Safe number — replaces NaN / Infinity with 0 */
function safe(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return n;
}

function isInRange(date: Date | null, start: Date, end: Date): boolean {
  if (!date) return false;
  return date >= start && date <= end;
}

function matchesFilter(item: Record<string, unknown>, filter: ReportFilter): boolean {
  const val = item[filter.field];
  const target = filter.value;

  if (val === undefined || val === null) return false;

  switch (filter.operator) {
    case '==': return val == target; // eslint-disable-line eqeqeq
    case '!=': return val != target; // eslint-disable-line eqeqeq
    case '>':  return Number(val) > Number(target);
    case '<':  return Number(val) < Number(target);
    case '>=': return Number(val) >= Number(target);
    case '<=': return Number(val) <= Number(target);
    default: return true;
  }
}

function applyFilters<T extends Record<string, unknown>>(
  items: T[],
  filters: ReportFilter[]
): T[] {
  if (!filters || filters.length === 0) return items;
  return items.filter((item) => filters.every((f) => matchesFilter(item, f)));
}

// ==============================
// Per-Source Metric Computation
// ==============================

interface DataSets {
  jobs: Job[];
  leads: Lead[];
  campaigns: Campaign[];
  invoices: Invoice[];
  contractors: Contractor[];
}

function computeJobMetrics(jobs: Job[], field: string): number {
  if (!jobs.length) return 0;

  switch (field) {
    case 'count':
      return jobs.length;
    case 'totalRevenue':
      return safe(jobs.reduce((sum, j) => sum + (j.commission?.contractValue || 0), 0));
    case 'avgJobValue': {
      const total = jobs.reduce((sum, j) => sum + (j.commission?.contractValue || 0), 0);
      return safe(total / jobs.length);
    }
    case 'completionRate': {
      const completed = jobs.filter((j) =>
        j.status === 'complete' || j.status === 'paid_in_full'
      ).length;
      return safe((completed / jobs.length) * 100);
    }
    case 'avgDaysToComplete': {
      const completedJobs = jobs.filter((j) => {
        const start = toDate(j.dates?.actualStart);
        const end = toDate(j.dates?.actualCompletion);
        return start && end;
      });
      if (!completedJobs.length) return 0;
      const totalDays = completedJobs.reduce((sum, j) => {
        const start = toDate(j.dates.actualStart)!;
        const end = toDate(j.dates.actualCompletion)!;
        return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      return safe(totalDays / completedJobs.length);
    }
    default:
      return 0;
  }
}

function computeLeadMetrics(leads: Lead[], field: string): number {
  if (!leads.length) return 0;

  switch (field) {
    case 'count':
      return leads.length;
    case 'conversionRate': {
      const converted = leads.filter((l) => l.status === 'converted').length;
      return safe((converted / leads.length) * 100);
    }
    case 'avgTimeToConvert': {
      const convertedLeads = leads.filter((l) => {
        if (l.status !== 'converted') return false;
        const created = toDate(l.createdAt);
        const updated = toDate(l.updatedAt);
        return created && updated;
      });
      if (!convertedLeads.length) return 0;
      const totalDays = convertedLeads.reduce((sum, l) => {
        const created = toDate(l.createdAt)!;
        const updated = toDate(l.updatedAt)!;
        return sum + (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      return safe(totalDays / convertedLeads.length);
    }
    default:
      return 0;
  }
}

function computeCampaignMetrics(campaigns: Campaign[], field: string): number {
  if (!campaigns.length) return 0;

  switch (field) {
    case 'totalSpend':
      return safe(campaigns.reduce((sum, c) => sum + (c.spend || 0), 0));
    case 'avgCPL': {
      const withLeads = campaigns.filter((c) => c.leadsGenerated > 0);
      if (!withLeads.length) return 0;
      const totalCPL = withLeads.reduce((sum, c) => sum + c.spend / c.leadsGenerated, 0);
      return safe(totalCPL / withLeads.length);
    }
    case 'avgROI': {
      const withSpend = campaigns.filter((c) => c.spend > 0 && c.revenueAttributed != null);
      if (!withSpend.length) return 0;
      const totalROI = withSpend.reduce((sum, c) => {
        const rev = c.revenueAttributed || 0;
        return sum + ((rev - c.spend) / c.spend) * 100;
      }, 0);
      return safe(totalROI / withSpend.length);
    }
    default:
      return 0;
  }
}

function computeInvoiceMetrics(invoices: Invoice[], field: string): number {
  if (!invoices.length) return 0;

  const now = new Date();

  switch (field) {
    case 'totalBilled':
      return safe(invoices.reduce((sum, inv) => sum + (inv.total || 0), 0));
    case 'totalPaid': {
      return safe(
        invoices
          .filter((inv) => inv.status === 'paid')
          .reduce((sum, inv) => sum + (inv.total || 0), 0)
      );
    }
    case 'totalOverdue': {
      return safe(
        invoices
          .filter((inv) => {
            if (inv.status === 'paid') return false;
            const due = toDate(inv.dueDate);
            return due && due < now;
          })
          .reduce((sum, inv) => sum + (inv.total || 0), 0)
      );
    }
    case 'avgDaysToPay': {
      const paidInvoices = invoices.filter((inv) => {
        const created = toDate(inv.createdAt);
        const paid = toDate(inv.paidAt);
        return inv.status === 'paid' && created && paid;
      });
      if (!paidInvoices.length) return 0;
      const totalDays = paidInvoices.reduce((sum, inv) => {
        const created = toDate(inv.createdAt)!;
        const paid = toDate(inv.paidAt)!;
        return sum + (paid.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
      }, 0);
      return safe(totalDays / paidInvoices.length);
    }
    default:
      return 0;
  }
}

function computeContractorMetrics(contractors: Contractor[], field: string): number {
  if (!contractors.length) return 0;

  switch (field) {
    case 'activeCount':
      return contractors.filter((c) => c.status === 'active').length;
    case 'avgRating': {
      const withRating = contractors.filter((c) => c.rating?.overall);
      if (!withRating.length) return 0;
      const total = withRating.reduce((sum, c) => sum + (c.rating?.overall || 0), 0);
      return safe(total / withRating.length);
    }
    default:
      return 0;
  }
}

function computeMetric(data: DataSets, metric: MetricSelection): number {
  switch (metric.source) {
    case 'jobs': return computeJobMetrics(data.jobs, metric.field);
    case 'leads': return computeLeadMetrics(data.leads, metric.field);
    case 'campaigns': return computeCampaignMetrics(data.campaigns, metric.field);
    case 'invoices': return computeInvoiceMetrics(data.invoices, metric.field);
    case 'contractors': return computeContractorMetrics(data.contractors, metric.field);
    default: return 0;
  }
}

// ==============================
// Grouping
// ==============================

function getGroupKey(
  item: Record<string, unknown>,
  groupBy: GroupBy,
  source: MetricSource
): string {
  switch (groupBy) {
    case 'month': {
      const dateField = source === 'invoices' ? 'createdAt' : 'createdAt';
      const d = toDate(item[dateField]);
      if (!d) return 'Unknown';
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    case 'week': {
      const d = toDate(item.createdAt);
      if (!d) return 'Unknown';
      const startOfWeek = new Date(d);
      startOfWeek.setDate(d.getDate() - d.getDay());
      return `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
    }
    case 'status':
      return String(item.status || 'Unknown');
    case 'type':
      return String(item.type || item.platform || 'Unknown');
    case 'source':
      return String(item.source || 'Unknown');
    case 'market':
      return String(item.market || 'Unknown');
    case 'trade':
      return String(item.trade || 'Unknown');
    case 'salesRep':
      return String(item.salesRepId || item.assignedTo || 'Unassigned');
    case 'product':
      return String(item.productName || item.product || item.itemName || item.name || 'Unknown');
    case 'color':
      return String(item.color || item.productColor || 'Unknown');
    default:
      return 'All';
  }
}

function getSourceItems(data: DataSets, source: MetricSource): Record<string, unknown>[] {
  switch (source) {
    case 'jobs': return data.jobs as unknown as Record<string, unknown>[];
    case 'leads': return data.leads as unknown as Record<string, unknown>[];
    case 'campaigns': return data.campaigns as unknown as Record<string, unknown>[];
    case 'invoices': return data.invoices as unknown as Record<string, unknown>[];
    case 'contractors': return data.contractors as unknown as Record<string, unknown>[];
    default: return [];
  }
}

// ==============================
// Date-range filtering
// ==============================

function filterByDateRange<T>(items: T[], start: Date, end: Date): T[] {
  return items.filter((item) => {
    const d = toDate((item as Record<string, unknown>).createdAt);
    return isInRange(d, start, end);
  });
}

// ==============================
// Execute Report
// ==============================

export function executeReport(
  config: ReportConfig,
  rawData: DataSets
): ReportResult {
  const startDate = new Date(config.dateRange.start);
  const endDate = new Date(config.dateRange.end);
  // Set end to end of day
  endDate.setHours(23, 59, 59, 999);

  // 1. Apply date range filter to all data sources
  const data: DataSets = {
    jobs: filterByDateRange(rawData.jobs, startDate, endDate),
    leads: filterByDateRange(rawData.leads, startDate, endDate),
    campaigns: filterByDateRange(rawData.campaigns, startDate, endDate),
    invoices: filterByDateRange(rawData.invoices, startDate, endDate),
    contractors: rawData.contractors, // Contractors don't filter by date
  };

  // 2. Apply user-defined filters to each source
  if (config.filters.length > 0) {
    data.jobs = applyFilters(data.jobs as unknown as Record<string, unknown>[], config.filters) as unknown as Job[];
    data.leads = applyFilters(data.leads as unknown as Record<string, unknown>[], config.filters) as unknown as Lead[];
    data.campaigns = applyFilters(data.campaigns as unknown as Record<string, unknown>[], config.filters) as unknown as Campaign[];
    data.invoices = applyFilters(data.invoices as unknown as Record<string, unknown>[], config.filters) as unknown as Invoice[];
    data.contractors = applyFilters(data.contractors as unknown as Record<string, unknown>[], config.filters) as unknown as Contractor[];
  }

  // 3. If no groupBy, compute totals and return a single row
  if (!config.groupBy) {
    const totals: Record<string, number> = {};
    const row: Record<string, unknown> = { group: 'Total' };

    for (const metric of config.metrics) {
      const value = computeMetric(data, metric);
      const key = metric.label;
      row[key] = value;
      totals[key] = value;
    }

    return {
      data: [row],
      totals,
      generatedAt: new Date().toISOString(),
    };
  }

  // 4. Group data and compute metrics per group
  // Determine primary source from the first metric
  const primarySource = config.metrics[0]?.source || 'jobs';
  const items = getSourceItems(data, primarySource);

  // Build groups
  const groups: Record<string, Record<string, unknown>[]> = {};
  for (const item of items) {
    const key = getGroupKey(item, config.groupBy, primarySource);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }

  // Compute metrics per group
  const resultData: Record<string, unknown>[] = [];
  const totals: Record<string, number> = {};

  // Initialize totals
  for (const metric of config.metrics) {
    totals[metric.label] = 0;
  }

  const sortedKeys = Object.keys(groups).sort();
  for (const groupKey of sortedKeys) {
    const groupItems = groups[groupKey];
    const row: Record<string, unknown> = { group: groupKey };

    for (const metric of config.metrics) {
      // Build a data subset for this group
      const groupData: DataSets = { ...data };

      // Replace the primary source data with the grouped items
      if (metric.source === primarySource) {
        (groupData as unknown as Record<string, unknown>)[metric.source] = groupItems;
      }

      const value = computeMetric(groupData, metric);
      row[metric.label] = value;
      totals[metric.label] = safe(totals[metric.label] + value);
    }

    resultData.push(row);
  }

  // For avg-type metrics in totals, re-compute from full data
  for (const metric of config.metrics) {
    if (metric.aggregation === 'avg') {
      totals[metric.label] = computeMetric(data, metric);
    }
  }

  return {
    data: resultData,
    totals,
    generatedAt: new Date().toISOString(),
  };
}

// ==============================
// CSV Export
// ==============================

export function exportToCSV(result: ReportResult, config: ReportConfig): string {
  if (!result.data.length) return '';

  const metricLabels = config.metrics.map((m) => m.label);
  const headers = config.groupBy ? ['Group', ...metricLabels] : metricLabels;

  const rows: string[] = [headers.join(',')];

  for (const row of result.data) {
    const values = config.groupBy
      ? [escapeCSV(String(row.group || '')), ...metricLabels.map((l) => String(row[l] ?? 0))]
      : metricLabels.map((l) => String(row[l] ?? 0));
    rows.push(values.join(','));
  }

  // Totals row
  const totalValues = config.groupBy
    ? ['TOTALS', ...metricLabels.map((l) => String(result.totals[l] ?? 0))]
    : metricLabels.map((l) => String(result.totals[l] ?? 0));
  rows.push(totalValues.join(','));

  return rows.join('\n');
}

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ==============================
// Format helpers (for display)
// ==============================

export function getMetricFormat(source: MetricSource, field: string): 'number' | 'currency' | 'percent' | 'days' {
  const catalog = getAvailableMetrics();
  const metrics = catalog[source];
  const def = metrics.find((m) => m.field === field);
  return def?.format || 'number';
}

export function formatMetricValue(value: number, format: 'number' | 'currency' | 'percent' | 'days'): string {
  const safeVal = safe(value);
  switch (format) {
    case 'currency':
      return `$${safeVal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case 'percent':
      return `${safeVal.toFixed(1)}%`;
    case 'days':
      return `${safeVal.toFixed(1)} days`;
    case 'number':
    default:
      return safeVal.toLocaleString('en-US', { maximumFractionDigits: 1 });
  }
}

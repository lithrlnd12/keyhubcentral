import { Timestamp } from 'firebase/firestore';

export type MetricSource = 'jobs' | 'leads' | 'campaigns' | 'invoices' | 'contractors';
export type Aggregation = 'count' | 'sum' | 'avg' | 'min' | 'max';
export type GroupBy = 'month' | 'week' | 'status' | 'type' | 'source' | 'market' | 'trade' | 'salesRep';

export interface MetricSelection {
  source: MetricSource;
  field: string;
  aggregation: Aggregation;
  label: string;
}

export interface ReportFilter {
  field: string;
  operator: '==' | '!=' | '>' | '<' | '>=' | '<=';
  value: string | number;
}

export interface ReportConfig {
  id: string;
  name: string;
  description?: string;
  metrics: MetricSelection[];
  dateRange: { start: string; end: string }; // ISO date strings
  filters: ReportFilter[];
  groupBy?: GroupBy;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReportResult {
  data: Record<string, unknown>[];
  totals: Record<string, number>;
  generatedAt: string;
}

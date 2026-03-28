'use client';

import { useState, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Button, Input, Select } from '@/components/ui';
import { ReportResultsTable } from './ReportResultsTable';
import { ReportChart } from './ReportChart';
import { ReportPDFDocument } from '@/components/pdf/ReportPDFDocument';
import {
  ReportConfig,
  ReportResult,
  MetricSelection,
  ReportFilter,
  GroupBy,
  MetricSource,
  Aggregation,
} from '@/types/report';
import {
  getAvailableMetrics,
  executeReport,
  exportToCSV,
  MetricDefinition,
} from '@/lib/utils/reportEngine';
import { getJobs } from '@/lib/firebase/jobs';
import { getLeads } from '@/lib/firebase/leads';
import { getInvoices } from '@/lib/firebase/invoices';
import { saveReport } from '@/lib/firebase/reports';
import { useAuth } from '@/lib/hooks';
import { Timestamp } from 'firebase/firestore';
import {
  Plus,
  X,
  Play,
  Save,
  Download,
  FileText,
  BarChart3,
  Filter,
  Layers,
  Presentation,
} from 'lucide-react';
import { PresentationBuilder } from './PresentationBuilder';

interface ReportBuilderProps {
  /** Pre-populate from a saved report for editing */
  initialConfig?: ReportConfig | null;
}

const SOURCE_OPTIONS = [
  { value: 'jobs', label: 'Jobs' },
  { value: 'leads', label: 'Leads' },
  { value: 'campaigns', label: 'Campaigns' },
  { value: 'invoices', label: 'Invoices' },
  { value: 'contractors', label: 'Contractors' },
];

const GROUP_BY_OPTIONS = [
  { value: '', label: 'No Grouping' },
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'status', label: 'Status' },
  { value: 'type', label: 'Type' },
  { value: 'source', label: 'Source' },
  { value: 'market', label: 'Market' },
  { value: 'trade', label: 'Trade' },
  { value: 'salesRep', label: 'Sales Rep' },
];

const DATE_PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
  { label: 'YTD', days: 0 },
];

function applyDatePreset(preset: { label: string; days: number }) {
  const end = new Date();
  const start = new Date();
  if (preset.label === 'YTD') {
    start.setMonth(0, 1);
  } else {
    start.setDate(start.getDate() - preset.days);
  }
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

const OPERATOR_OPTIONS = [
  { value: '==', label: '=' },
  { value: '!=', label: '!=' },
  { value: '>', label: '>' },
  { value: '<', label: '<' },
  { value: '>=', label: '>=' },
  { value: '<=', label: '<=' },
];

function getDefaultDateRange() {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

export function ReportBuilder({ initialConfig }: ReportBuilderProps) {
  const { user } = useAuth();
  const catalog = getAvailableMetrics();

  // Form state
  const [reportName, setReportName] = useState(initialConfig?.name || '');
  const [description, setDescription] = useState(initialConfig?.description || '');
  const [metrics, setMetrics] = useState<MetricSelection[]>(
    initialConfig?.metrics || []
  );
  const [dateRange, setDateRange] = useState(
    initialConfig?.dateRange || getDefaultDateRange()
  );
  const [filters, setFilters] = useState<ReportFilter[]>(
    initialConfig?.filters || []
  );
  const [groupBy, setGroupBy] = useState<GroupBy | ''>(
    initialConfig?.groupBy || ''
  );

  // Metric picker state
  const [pickerSource, setPickerSource] = useState<MetricSource>('jobs');

  // Execution state
  const [result, setResult] = useState<ReportResult | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPresentation, setShowPresentation] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableMetricsForSource = catalog[pickerSource] || [];

  const addMetric = (def: MetricDefinition) => {
    const newMetric: MetricSelection = {
      source: pickerSource,
      field: def.field,
      aggregation: def.aggregation,
      label: def.label,
    };
    // Prevent duplicates
    if (metrics.some((m) => m.source === newMetric.source && m.field === newMetric.field)) {
      return;
    }
    setMetrics((prev) => [...prev, newMetric]);
  };

  const removeMetric = (index: number) => {
    setMetrics((prev) => prev.filter((_, i) => i !== index));
  };

  const addFilter = () => {
    setFilters((prev) => [
      ...prev,
      { field: 'status', operator: '==', value: '' },
    ]);
  };

  const updateFilter = (index: number, updates: Partial<ReportFilter>) => {
    setFilters((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...updates } : f))
    );
  };

  const removeFilter = (index: number) => {
    setFilters((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRun = useCallback(async () => {
    if (metrics.length === 0) {
      setError('Add at least one metric to run the report.');
      return;
    }
    if (!dateRange.start || !dateRange.end) {
      setError('Please select a date range.');
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    try {
      // Fetch data from Firestore
      const [jobs, leads, invoices] = await Promise.all([
        getJobs(),
        getLeads(),
        getInvoices(),
      ]);

      // Note: campaigns and contractors are loaded from the same collections
      // For campaigns, we query the campaigns collection directly
      // For contractors, we query the contractors collection directly
      const { getDocs, collection, query: firestoreQuery, orderBy } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase/config');

      const [campaignsSnap, contractorsSnap] = await Promise.all([
        getDocs(firestoreQuery(collection(db, 'campaigns'), orderBy('createdAt', 'desc'))),
        getDocs(firestoreQuery(collection(db, 'contractors'), orderBy('createdAt', 'desc'))),
      ]);

      const campaigns = campaignsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
      const contractors = contractorsSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

      const config: ReportConfig = {
        id: initialConfig?.id || '',
        name: reportName || 'Untitled Report',
        description,
        metrics,
        dateRange,
        filters,
        groupBy: groupBy || undefined,
        createdBy: user?.uid || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      const reportResult = executeReport(config, {
        jobs,
        leads,
        campaigns,
        invoices,
        contractors,
      });

      setResult(reportResult);
    } catch (err) {
      console.error('Report execution failed:', err);
      setError('Failed to run report. Please try again.');
    } finally {
      setRunning(false);
    }
  }, [metrics, dateRange, filters, groupBy, reportName, description, user?.uid, initialConfig?.id]);

  const handleSave = async () => {
    if (!user?.uid) return;
    if (!reportName.trim()) {
      setError('Please enter a report name.');
      return;
    }
    if (metrics.length === 0) {
      setError('Add at least one metric before saving.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await saveReport({
        name: reportName.trim(),
        description: description.trim() || undefined,
        metrics,
        dateRange,
        filters,
        groupBy: groupBy || undefined,
        createdBy: user.uid,
      });
      alert('Report saved successfully!');
    } catch (err) {
      console.error('Failed to save report:', err);
      setError('Failed to save report.');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (!result) return;

    const config: ReportConfig = {
      id: '',
      name: reportName || 'Untitled Report',
      metrics,
      dateRange,
      filters,
      groupBy: groupBy || undefined,
      createdBy: user?.uid || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const csv = exportToCSV(result, config);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${reportName || 'report'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = async () => {
    if (!result) return;
    setPdfLoading(true);
    try {
      const config: ReportConfig = {
        id: '',
        name: reportName || 'Untitled Report',
        metrics,
        dateRange,
        filters,
        groupBy: groupBy || undefined,
        createdBy: user?.uid || '',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      const doc = <ReportPDFDocument config={config} result={result} />;
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportName || 'report'}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError('Failed to generate PDF.');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Report Name & Description */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Report Name"
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            placeholder="e.g., Monthly Revenue Summary"
          />
          <Input
            label="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this report"
          />
        </div>
      </div>

      {/* Date Range + Group By — compact single row */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300">Date Range &amp; Grouping</h4>
          <div className="flex gap-1">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => setDateRange(applyDatePreset(preset))}
                className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-800 text-gray-400 hover:bg-brand-gold/10 hover:text-brand-gold border border-gray-700 hover:border-brand-gold/40 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Input
            label="Start Date"
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
          />
          <Input
            label="End Date"
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
          />
          <div className="col-span-2">
            <Select
              label="Group By"
              options={GROUP_BY_OPTIONS}
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupBy | '')}
            />
          </div>
        </div>
      </div>

      {/* Metric Picker — source tabs + full-width metric grid */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-gold" />
          Metrics
          {metrics.length > 0 && (
            <span className="ml-1 text-xs font-normal text-gray-500">
              ({metrics.length} selected)
            </span>
          )}
        </h4>

        {/* Selected Metrics */}
        {metrics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-800">
            {metrics.map((m, i) => (
              <span
                key={`${m.source}-${m.field}-${i}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/10 text-brand-gold text-sm rounded-lg border border-brand-gold/30"
              >
                <span className="text-xs text-gray-500 capitalize">{m.source}:</span>
                {m.label}
                <button
                  onClick={() => removeMetric(i)}
                  className="ml-1 hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Source tab pills */}
        <div className="flex gap-1 mb-4 p-1 bg-gray-900/60 rounded-lg w-full">
          {SOURCE_OPTIONS.map((src) => (
            <button
              key={src.value}
              onClick={() => setPickerSource(src.value as MetricSource)}
              className={`flex-1 px-2 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all ${
                pickerSource === src.value
                  ? 'bg-brand-gold text-black shadow'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {src.label}
            </button>
          ))}
        </div>

        {/* Available metrics — full-width wrapping grid */}
        <div className="flex flex-wrap gap-2">
          {availableMetricsForSource.length === 0 && (
            <p className="text-sm text-gray-500">No metrics available for this source.</p>
          )}
          {availableMetricsForSource.map((def) => {
            const alreadyAdded = metrics.some(
              (m) => m.source === pickerSource && m.field === def.field
            );
            return (
              <button
                key={def.field}
                onClick={() => addMetric(def)}
                disabled={alreadyAdded}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                  alreadyAdded
                    ? 'border-brand-gold/30 bg-brand-gold/5 text-brand-gold/50 cursor-not-allowed'
                    : 'border-gray-700 text-gray-300 hover:border-brand-gold hover:text-brand-gold hover:bg-brand-gold/5'
                }`}
              >
                {!alreadyAdded && <Plus className="w-3.5 h-3.5 inline mr-1 opacity-70" />}
                {def.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-gold" />
            Filters
            {filters.length > 0 && (
              <span className="text-xs text-gray-500">({filters.length} active)</span>
            )}
          </h4>
          <Button size="sm" variant="ghost" onClick={addFilter}>
            <Plus className="w-4 h-4 mr-1" />
            Add Filter
          </Button>
        </div>

        {filters.length === 0 && (
          <p className="text-sm text-gray-600 italic">No filters — showing all records in date range.</p>
        )}

        <div className="space-y-2">
          {filters.map((filter, i) => (
            <div key={i} className="flex items-end gap-2">
              <Input
                label={i === 0 ? 'Field' : undefined}
                value={filter.field}
                onChange={(e) => updateFilter(i, { field: e.target.value })}
                placeholder="e.g., status"
                className="flex-1"
              />
              <Select
                label={i === 0 ? 'Op' : undefined}
                options={OPERATOR_OPTIONS}
                value={filter.operator}
                onChange={(e) =>
                  updateFilter(i, { operator: e.target.value as ReportFilter['operator'] })
                }
                className="w-20"
              />
              <Input
                label={i === 0 ? 'Value' : undefined}
                value={String(filter.value)}
                onChange={(e) => updateFilter(i, { value: e.target.value })}
                placeholder="e.g., complete"
                className="flex-1"
              />
              <button
                onClick={() => removeFilter(i)}
                className="h-10 px-2 text-gray-400 hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions row — always visible at top of output area */}
      <div className="flex flex-wrap items-center gap-3 py-2">
        <Button onClick={handleRun} loading={running} disabled={running}>
          <Play className="w-4 h-4 mr-2" />
          Run Report
        </Button>
        <Button variant="outline" onClick={handleSave} loading={saving} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        {result && (
          <>
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              CSV
            </Button>
            <Button variant="outline" onClick={handleExportPDF} loading={pdfLoading} disabled={pdfLoading}>
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={() => setShowPresentation(true)}>
              <Presentation className="w-4 h-4 mr-2" />
              Presentation
            </Button>
          </>
        )}
        {result && (
          <span className="ml-auto text-xs text-gray-500">
            Generated {new Date(result.generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Presentation Builder modal */}
      {showPresentation && result && (
        <PresentationBuilder
          config={{
            id: initialConfig?.id || '',
            name: reportName || 'Untitled Report',
            description,
            metrics,
            dateRange,
            filters,
            groupBy: groupBy || undefined,
            createdBy: user?.uid || '',
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
          }}
          result={result}
          onClose={() => setShowPresentation(false)}
        />
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-brand-gold" />
              Chart
            </h4>
            <ReportChart
              result={result}
              config={{
                id: '',
                name: reportName || 'Untitled',
                metrics,
                dateRange,
                filters,
                groupBy: groupBy || undefined,
                createdBy: user?.uid || '',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              }}
            />
          </div>

          <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-brand-gold" />
              Data Table
            </h4>
            <ReportResultsTable
              result={result}
              config={{
                id: '',
                name: reportName || 'Untitled',
                metrics,
                dateRange,
                filters,
                groupBy: groupBy || undefined,
                createdBy: user?.uid || '',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

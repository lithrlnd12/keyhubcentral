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
} from 'lucide-react';

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
  { value: '', label: 'None' },
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'status', label: 'Status' },
  { value: 'type', label: 'Type' },
  { value: 'source', label: 'Source' },
  { value: 'market', label: 'Market' },
  { value: 'trade', label: 'Trade' },
  { value: 'salesRep', label: 'Sales Rep' },
];

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
    <div className="space-y-6">
      {/* Report Name & Description */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4 space-y-4">
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

      {/* Date Range */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Date Range</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Start Date"
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, start: e.target.value }))
            }
          />
          <Input
            label="End Date"
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, end: e.target.value }))
            }
          />
        </div>
      </div>

      {/* Metric Picker */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-brand-gold" />
          Metrics
        </h4>

        {/* Selected Metrics */}
        {metrics.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {metrics.map((m, i) => (
              <span
                key={`${m.source}-${m.field}-${i}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold/10 text-brand-gold text-sm rounded-lg border border-brand-gold/30"
              >
                <span className="text-xs text-gray-400">{m.source}:</span>
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

        {/* Add Metric */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select
            label="Source"
            options={SOURCE_OPTIONS}
            value={pickerSource}
            onChange={(e) => setPickerSource(e.target.value as MetricSource)}
          />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Available Metrics
            </label>
            <div className="flex flex-wrap gap-2">
              {availableMetricsForSource.map((def) => {
                const alreadyAdded = metrics.some(
                  (m) => m.source === pickerSource && m.field === def.field
                );
                return (
                  <button
                    key={def.field}
                    onClick={() => addMetric(def)}
                    disabled={alreadyAdded}
                    className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      alreadyAdded
                        ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                        : 'border-gray-600 text-gray-300 hover:border-brand-gold hover:text-brand-gold'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 inline mr-1" />
                    {def.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
            <Filter className="w-4 h-4 text-brand-gold" />
            Filters
          </h4>
          <Button size="sm" variant="ghost" onClick={addFilter}>
            <Plus className="w-4 h-4 mr-1" />
            Add Filter
          </Button>
        </div>

        {filters.length === 0 && (
          <p className="text-sm text-gray-500">No filters applied.</p>
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
                label={i === 0 ? 'Operator' : undefined}
                options={OPERATOR_OPTIONS}
                value={filter.operator}
                onChange={(e) =>
                  updateFilter(i, {
                    operator: e.target.value as ReportFilter['operator'],
                  })
                }
                className="w-24"
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

      {/* Group By */}
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
        <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-gold" />
          Group By
        </h4>
        <Select
          options={GROUP_BY_OPTIONS}
          value={groupBy}
          onChange={(e) => setGroupBy(e.target.value as GroupBy | '')}
          placeholder="No grouping"
        />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
            <h4 className="text-sm font-medium text-gray-300 mb-4">Chart</h4>
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
            <h4 className="text-sm font-medium text-gray-300 mb-4">
              Results
              <span className="ml-2 text-xs text-gray-500">
                Generated {new Date(result.generatedAt).toLocaleString()}
              </span>
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

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={handleRun} loading={running} disabled={running}>
          <Play className="w-4 h-4 mr-2" />
          Run Report
        </Button>
        <Button variant="outline" onClick={handleSave} loading={saving} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          Save Report
        </Button>
        {result && (
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        )}
        {result && (
          <Button variant="outline" onClick={handleExportPDF} loading={pdfLoading} disabled={pdfLoading}>
            <FileText className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        )}
      </div>
    </div>
  );
}

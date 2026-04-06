'use client';

import { useState, useEffect } from 'react';
import { ReportConfig } from '@/types/report';
import { getReports, deleteReport } from '@/lib/firebase/reports';
import { useAuth } from '@/lib/hooks';
import { Button } from '@/components/ui';
import { Play, Pencil, Trash2, Download, FileText } from 'lucide-react';

interface SavedReportsListProps {
  onRunReport: (config: ReportConfig) => void;
  onEditReport: (config: ReportConfig) => void;
  onExportCSV: (config: ReportConfig) => void;
}

export function SavedReportsList({
  onRunReport,
  onEditReport,
  onExportCSV,
}: SavedReportsListProps) {
  const { user } = useAuth();
  const [reports, setReports] = useState<ReportConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    loadReports();
  }, [user?.uid]);

  const loadReports = async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const data = await getReports(user.uid);
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this saved report?')) return;
    setDeletingId(id);
    try {
      await deleteReport(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete report:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (timestamp: { toDate?: () => Date } | null): string => {
    if (!timestamp) return 'N/A';
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return 'N/A';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-400">
        Loading saved reports...
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <FileText className="w-12 h-12 mb-4 text-gray-600" />
        <p className="text-lg font-medium text-gray-300">No Saved Reports</p>
        <p className="text-sm mt-1">
          Build and save a report to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-800">
      {reports.map((report) => (
        <div
          key={report.id}
          className="p-4 hover:bg-white/5 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-medium truncate">{report.name}</h4>
              {report.description && (
                <p className="text-sm text-gray-400 mt-0.5 truncate">
                  {report.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                <span>
                  {report.metrics.length} metric{report.metrics.length !== 1 ? 's' : ''}
                </span>
                <span>
                  {report.dateRange.start} to {report.dateRange.end}
                </span>
                {report.groupBy && <span>Grouped by {report.groupBy}</span>}
                <span>Created {formatDate(report.createdAt)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                size="sm"
                onClick={() => onRunReport(report)}
                title="Run Report"
              >
                <Play className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEditReport(report)}
                title="Edit"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onExportCSV(report)}
                title="Export CSV"
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleDelete(report.id)}
                disabled={deletingId === report.id}
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import Link from 'next/link';
import { useAuth } from '@/lib/hooks/useAuth';
import { getJobs } from '@/lib/firebase/jobs';
import { getJobContracts } from '@/lib/firebase/contracts';
import { getAddendums } from '@/lib/firebase/addendums';
import { getCommunications } from '@/lib/firebase/communications';
import { Job } from '@/types/job';
import { JobPackagePDF } from '@/components/pdf/JobPackagePDF';
import { Spinner } from '@/components/ui/Spinner';
import {
  ArrowLeft,
  FolderOpen,
  Download,
  Loader2,
  FileText,
  ChevronDown,
  ChevronRight,
  Calendar,
  Search,
} from 'lucide-react';

type MonthGroup = {
  key: string; // "2026-03"
  label: string; // "March 2026"
  jobs: Job[];
};

export default function JobHistoryPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'paid_in_full'>('all');

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const allJobs = await getJobs();
      // Filter to completed/paid jobs
      const completedJobs = allJobs.filter(
        (j) => j.status === 'complete' || j.status === 'paid_in_full'
      );
      setJobs(completedJobs);
      // Auto-expand the most recent month
      if (completedJobs.length > 0) {
        const firstJob = completedJobs[0];
        const date = firstJob.dates?.actualCompletion?.toDate() || firstJob.updatedAt?.toDate() || new Date();
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        setExpandedMonths(new Set([key]));
      }
    } catch (err) {
      console.error('Failed to load jobs:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  // Group jobs by completion month
  const monthGroups: MonthGroup[] = (() => {
    let filtered = jobs;

    if (statusFilter !== 'all') {
      filtered = filtered.filter((j) => j.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (j) =>
          j.jobNumber?.toLowerCase().includes(q) ||
          j.customer?.name?.toLowerCase().includes(q) ||
          j.type?.toLowerCase().includes(q)
      );
    }

    const groups = new Map<string, Job[]>();

    for (const job of filtered) {
      const date = job.dates?.actualCompletion?.toDate() || job.dates?.paidInFull?.toDate() || job.updatedAt?.toDate() || new Date();
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(job);
    }

    // Sort by date descending
    return Array.from(groups.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, jobs]) => {
        const [year, month] = key.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return {
          key,
          label: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
          jobs,
        };
      });
  })();

  const toggleMonth = (key: string) => {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExport = async (job: Job) => {
    if (!user) return;
    setExporting(job.id);

    try {
      // Fetch all related data
      const [contracts, addendums, communications] = await Promise.all([
        getJobContracts(job.id).catch(() => []),
        getAddendums(job.id).catch(() => []),
        getCommunications(job.id).catch(() => []),
      ]);

      // Generate PDF
      const pdfDoc = (
        <JobPackagePDF
          job={job}
          contracts={contracts}
          addendums={addendums}
          communications={communications}
        />
      );
      const blob = await pdf(pdfDoc).toBlob();

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${job.jobNumber}-Job-Package.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(null);
    }
  };

  const formatDate = (ts: { toDate?: () => Date } | null | undefined) => {
    if (!ts || !ts.toDate) return '—';
    return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin"
          className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Job History</h1>
          <p className="text-gray-400">Completed jobs organized by date — export full job packages</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by job number, customer, or type..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'complete' | 'paid_in_full')}
          className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gold"
        >
          <option value="all">All Completed</option>
          <option value="complete">Complete</option>
          <option value="paid_in_full">Paid in Full</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Total Completed</p>
          <p className="text-2xl font-bold text-white">{jobs.length}</p>
        </div>
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Paid in Full</p>
          <p className="text-2xl font-bold text-green-400">{jobs.filter((j) => j.status === 'paid_in_full').length}</p>
        </div>
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Awaiting Payment</p>
          <p className="text-2xl font-bold text-yellow-400">{jobs.filter((j) => j.status === 'complete').length}</p>
        </div>
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Months</p>
          <p className="text-2xl font-bold text-white">{monthGroups.length}</p>
        </div>
      </div>

      {/* Month Folders */}
      {monthGroups.length > 0 ? (
        <div className="space-y-3">
          {monthGroups.map((group) => (
            <div key={group.key} className="bg-brand-charcoal border border-gray-800 rounded-xl overflow-hidden">
              {/* Month Header */}
              <button
                onClick={() => toggleMonth(group.key)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FolderOpen className="h-5 w-5 text-gold" />
                  <span className="text-white font-medium">{group.label}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full text-gray-300">
                    {group.jobs.length} job{group.jobs.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {expandedMonths.has(group.key) ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </button>

              {/* Job List */}
              {expandedMonths.has(group.key) && (
                <div className="border-t border-gray-800">
                  {group.jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between px-5 py-3 border-b border-gray-800/50 last:border-b-0 hover:bg-gray-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <FileText className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/kr/${job.id}`}
                              className="text-white font-medium hover:text-gold transition-colors"
                            >
                              {job.jobNumber}
                            </Link>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              job.status === 'paid_in_full'
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-yellow-500/20 text-yellow-400'
                            }`}>
                              {job.status === 'paid_in_full' ? 'Paid' : 'Complete'}
                            </span>
                            <span className="text-xs text-gray-500 capitalize">{job.type}</span>
                          </div>
                          <p className="text-sm text-gray-400 truncate">
                            {job.customer.name} — {job.customer.address?.city}, {job.customer.address?.state}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                        <span className="text-xs text-gray-500 hidden sm:block">
                          {formatDate(job.dates?.actualCompletion || job.dates?.paidInFull)}
                        </span>
                        <button
                          onClick={() => handleExport(job)}
                          disabled={exporting === job.id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                        >
                          {exporting === job.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Download className="h-3.5 w-3.5" />
                          )}
                          <span className="hidden sm:inline">Export PDF</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-12 text-center">
          <Calendar className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No Completed Jobs</h3>
          <p className="text-gray-400">
            Completed and paid-in-full jobs will appear here organized by month.
          </p>
        </div>
      )}
    </div>
  );
}

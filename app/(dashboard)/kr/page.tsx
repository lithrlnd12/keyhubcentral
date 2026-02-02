'use client';

import { useMemo } from 'react';
import { useJobs } from '@/lib/hooks/useJobs';
import { useAuth } from '@/lib/hooks/useAuth';
import { JobList, JobFilters } from '@/components/jobs';
import { Button } from '@/components/ui/Button';
import { Plus, Briefcase } from 'lucide-react';
import Link from 'next/link';
import { getJobCountSummary } from '@/lib/utils/jobs';

export default function KRPage() {
  const { user } = useAuth();

  // Sales reps only see jobs assigned to them, up through front_end_hold stage
  const isSalesRep = user?.role === 'sales_rep';

  const {
    jobs: allJobs,
    loading,
    error,
    filters,
    setStatus,
    setType,
    setSearch,
  } = useJobs({ realtime: true });

  // Filter jobs for sales reps: only their jobs in lead/sold stages
  // Once a job hits front_end_hold, it's handed off to operations
  const jobs = useMemo(() => {
    if (!isSalesRep || !user?.uid) return allJobs;

    const salesRepStages = ['lead', 'sold'];
    return allJobs.filter(
      (job) =>
        job.salesRepId === user.uid &&
        salesRepStages.includes(job.status)
    );
  }, [allJobs, isSalesRep, user?.uid]);

  const summary = getJobCountSummary(jobs);
  const canCreate = user?.role && ['owner', 'admin', 'pm', 'sales_rep'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Key Renovations</h1>
          <p className="text-gray-400 mt-1">
            {isSalesRep
              ? 'Your active deals in Lead and Sold stages'
              : 'Manage jobs, pipeline, and customer projects'}
          </p>
        </div>
        {canCreate && (
          <Link href="/kr/new">
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              New Job
            </Button>
          </Link>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Briefcase className="w-8 h-8 text-brand-gold" />
            <div>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
              <p className="text-sm text-gray-400">Total Jobs</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div>
            <p className="text-2xl font-bold text-blue-400">{summary.active}</p>
            <p className="text-sm text-gray-400">Active</p>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div>
            <p className="text-2xl font-bold text-green-400">{summary.completed}</p>
            <p className="text-sm text-gray-400">Completed</p>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div>
            <p className={`text-2xl font-bold ${summary.overdue > 0 ? 'text-red-400' : 'text-gray-400'}`}>
              {summary.overdue}
            </p>
            <p className="text-sm text-gray-400">Overdue</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <JobFilters
        status={filters.status}
        type={filters.type}
        search={filters.search}
        onStatusChange={setStatus}
        onTypeChange={setType}
        onSearchChange={setSearch}
      />

      {/* Job List */}
      <JobList
        jobs={jobs}
        loading={loading}
        error={error}
        showAddButton={canCreate}
        emptyMessage={
          filters.status || filters.type || filters.search
            ? 'No jobs match your filters'
            : isSalesRep
              ? 'No active deals. Jobs appear here when you convert leads.'
              : 'No jobs yet. Create your first job to get started.'
        }
      />
    </div>
  );
}

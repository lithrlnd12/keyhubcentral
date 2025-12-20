'use client';

import { useState } from 'react';
import { JobStatus, JobType } from '@/types/job';
import { JOB_STATUS_LABELS, JOB_TYPE_LABELS } from '@/lib/utils/jobs';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface JobFiltersProps {
  status?: JobStatus;
  type?: JobType;
  search?: string;
  onStatusChange: (status: JobStatus | undefined) => void;
  onTypeChange: (type: JobType | undefined) => void;
  onSearchChange: (search: string) => void;
  className?: string;
}

const STATUS_OPTIONS: (JobStatus | 'all')[] = [
  'all',
  'lead',
  'sold',
  'front_end_hold',
  'production',
  'scheduled',
  'started',
  'complete',
  'paid_in_full',
];

const TYPE_OPTIONS: (JobType | 'all')[] = [
  'all',
  'bathroom',
  'kitchen',
  'exterior',
  'other',
];

export function JobFilters({
  status,
  type,
  search = '',
  onStatusChange,
  onTypeChange,
  onSearchChange,
  className,
}: JobFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = status || type;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search and Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
            hasActiveFilters
              ? 'bg-brand-gold/20 border-brand-gold/50 text-brand-gold'
              : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
          )}
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">Filters</span>
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-brand-gold" />
          )}
        </button>
      </div>

      {/* Filter Dropdowns */}
      {showFilters && (
        <div className="flex flex-wrap gap-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          {/* Status Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Status</label>
            <select
              value={status || 'all'}
              onChange={(e) =>
                onStatusChange(e.target.value === 'all' ? undefined : (e.target.value as JobStatus))
              }
              className="block w-40 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-gold/50"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All Statuses' : JOB_STATUS_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>

          {/* Type Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Job Type</label>
            <select
              value={type || 'all'}
              onChange={(e) =>
                onTypeChange(e.target.value === 'all' ? undefined : (e.target.value as JobType))
              }
              className="block w-40 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-gold/50"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All Types' : JOB_TYPE_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex items-end">
              <button
                onClick={() => {
                  onStatusChange(undefined);
                  onTypeChange(undefined);
                }}
                className="px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active Filters Display */}
      {hasActiveFilters && !showFilters && (
        <div className="flex flex-wrap gap-2">
          {status && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300 border border-gray-700">
              Status: {JOB_STATUS_LABELS[status]}
              <button
                onClick={() => onStatusChange(undefined)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {type && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300 border border-gray-700">
              Type: {JOB_TYPE_LABELS[type]}
              <button
                onClick={() => onTypeChange(undefined)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

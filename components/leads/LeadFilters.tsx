'use client';

import { useState } from 'react';
import { LeadStatus, LeadSource, LeadQuality } from '@/types/lead';
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_QUALITY_LABELS,
} from '@/lib/utils/leads';
import { Search, Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface LeadFiltersProps {
  status?: LeadStatus;
  source?: LeadSource;
  quality?: LeadQuality;
  search?: string;
  onStatusChange: (status: LeadStatus | undefined) => void;
  onSourceChange: (source: LeadSource | undefined) => void;
  onQualityChange: (quality: LeadQuality | undefined) => void;
  onSearchChange: (search: string) => void;
  className?: string;
}

const STATUS_OPTIONS: (LeadStatus | 'all')[] = [
  'all',
  'new',
  'assigned',
  'contacted',
  'qualified',
  'converted',
  'lost',
  'returned',
];

const SOURCE_OPTIONS: (LeadSource | 'all')[] = [
  'all',
  'google_ads',
  'meta',
  'tiktok',
  'event',
  'referral',
  'other',
];

const QUALITY_OPTIONS: (LeadQuality | 'all')[] = ['all', 'hot', 'warm', 'cold'];

export function LeadFilters({
  status,
  source,
  quality,
  search = '',
  onStatusChange,
  onSourceChange,
  onQualityChange,
  onSearchChange,
  className,
}: LeadFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const hasActiveFilters = status || source || quality;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search and Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search leads..."
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
                onStatusChange(
                  e.target.value === 'all' ? undefined : (e.target.value as LeadStatus)
                )
              }
              className="block w-36 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-gold/50"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All Statuses' : LEAD_STATUS_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Source</label>
            <select
              value={source || 'all'}
              onChange={(e) =>
                onSourceChange(
                  e.target.value === 'all' ? undefined : (e.target.value as LeadSource)
                )
              }
              className="block w-40 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-gold/50"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All Sources' : LEAD_SOURCE_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>

          {/* Quality Filter */}
          <div className="space-y-1.5">
            <label className="text-xs text-gray-400 font-medium">Quality</label>
            <select
              value={quality || 'all'}
              onChange={(e) =>
                onQualityChange(
                  e.target.value === 'all' ? undefined : (e.target.value as LeadQuality)
                )
              }
              className="block w-28 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-brand-gold/50"
            >
              {QUALITY_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'All' : LEAD_QUALITY_LABELS[opt]}
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
                  onSourceChange(undefined);
                  onQualityChange(undefined);
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
              Status: {LEAD_STATUS_LABELS[status]}
              <button
                onClick={() => onStatusChange(undefined)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {source && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300 border border-gray-700">
              Source: {LEAD_SOURCE_LABELS[source]}
              <button
                onClick={() => onSourceChange(undefined)}
                className="text-gray-500 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {quality && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-800 rounded-full text-xs text-gray-300 border border-gray-700">
              Quality: {LEAD_QUALITY_LABELS[quality]}
              <button
                onClick={() => onQualityChange(undefined)}
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

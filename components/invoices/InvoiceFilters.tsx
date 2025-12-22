'use client';

import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InvoiceStatus, InvoiceEntity } from '@/types/invoice';
import { InvoiceFilters as IInvoiceFilters } from '@/lib/firebase/invoices';
import { cn } from '@/lib/utils';

interface InvoiceFiltersProps {
  filters: IInvoiceFilters;
  onStatusChange: (status: InvoiceStatus | undefined) => void;
  onFromEntityChange: (entity: InvoiceEntity['entity'] | undefined) => void;
  onSearchChange: (search: string) => void;
  onOverdueChange: (overdue: boolean) => void;
  onClear: () => void;
}

const statuses: { value: InvoiceStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
  { value: 'overdue', label: 'Overdue' },
];

const entities: { value: InvoiceEntity['entity'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All Sources' },
  { value: 'kd', label: 'Keynote Digital' },
  { value: 'kts', label: 'Key Trade Solutions' },
  { value: 'kr', label: 'Key Renovations' },
];

export function InvoiceFilters({
  filters,
  onStatusChange,
  onFromEntityChange,
  onSearchChange,
  onOverdueChange,
  onClear,
}: InvoiceFiltersProps) {
  const hasFilters =
    filters.status || filters.fromEntity || filters.search || filters.overdue;

  return (
    <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder="Search invoices..."
            value={filters.search || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-brand-black border border-gray-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-brand-gold"
          />
        </div>

        {/* Status Filter */}
        <select
          value={filters.status || 'all'}
          onChange={(e) =>
            onStatusChange(
              e.target.value === 'all' ? undefined : (e.target.value as InvoiceStatus)
            )
          }
          className="bg-brand-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold"
        >
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        {/* Entity Filter */}
        <select
          value={filters.fromEntity || 'all'}
          onChange={(e) =>
            onFromEntityChange(
              e.target.value === 'all'
                ? undefined
                : (e.target.value as InvoiceEntity['entity'])
            )
          }
          className="bg-brand-black border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-brand-gold"
        >
          {entities.map((entity) => (
            <option key={entity.value} value={entity.value}>
              {entity.label}
            </option>
          ))}
        </select>

        {/* Overdue Toggle */}
        <button
          onClick={() => onOverdueChange(!filters.overdue)}
          className={cn(
            'px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
            filters.overdue
              ? 'bg-red-500/20 border-red-500/50 text-red-400'
              : 'bg-brand-black border-gray-700 text-gray-400 hover:text-white'
          )}
        >
          Overdue Only
        </button>

        {/* Clear Filters */}
        {hasFilters && (
          <Button variant="ghost" onClick={onClear} className="flex-shrink-0">
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

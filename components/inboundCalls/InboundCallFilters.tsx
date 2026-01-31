'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { InboundCallStatus } from '@/types/inboundCall';
import { InboundCallFilters as Filters } from '@/lib/firebase/inboundCalls';

interface InboundCallFiltersProps {
  filters: Filters;
  onStatusChange: (status: InboundCallStatus | undefined) => void;
  onSearchChange: (search: string) => void;
  onClear: () => void;
}

const statusOptions = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'converted', label: 'Converted' },
  { value: 'closed', label: 'Closed' },
];

export function InboundCallFilters({
  filters,
  onStatusChange,
  onSearchChange,
  onClear,
}: InboundCallFiltersProps) {
  const hasFilters = filters.status || filters.search;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search calls..."
          value={filters.search || ''}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="flex gap-3">
        <Select
          options={statusOptions}
          placeholder="All Statuses"
          value={filters.status || ''}
          onChange={(e) =>
            onStatusChange(e.target.value ? (e.target.value as InboundCallStatus) : undefined)
          }
          className="w-36"
        />

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

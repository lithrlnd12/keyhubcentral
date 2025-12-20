'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { ContractorStatus, Trade } from '@/types/contractor';
import { ContractorFilters as Filters } from '@/lib/firebase/contractors';

interface ContractorFiltersProps {
  filters: Filters;
  onStatusChange: (status: ContractorStatus | undefined) => void;
  onTradeChange: (trade: Trade | undefined) => void;
  onSearchChange: (search: string) => void;
  onClear: () => void;
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const tradeOptions = [
  { value: 'installer', label: 'Installer' },
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'service_tech', label: 'Service Tech' },
  { value: 'pm', label: 'Project Manager' },
];

export function ContractorFilters({
  filters,
  onStatusChange,
  onTradeChange,
  onSearchChange,
  onClear,
}: ContractorFiltersProps) {
  const hasFilters = filters.status || filters.trade || filters.search;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          placeholder="Search contractors..."
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
            onStatusChange(e.target.value ? (e.target.value as ContractorStatus) : undefined)
          }
          className="w-36"
        />

        <Select
          options={tradeOptions}
          placeholder="All Trades"
          value={filters.trade || ''}
          onChange={(e) =>
            onTradeChange(e.target.value ? (e.target.value as Trade) : undefined)
          }
          className="w-40"
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

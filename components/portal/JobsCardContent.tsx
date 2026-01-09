'use client';

import { useState } from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/formatters';

interface Job {
  id: string;
  customerName: string;
  address: string;
  scheduledDate: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  amount: number;
  description: string;
}

// Mock data - will be replaced with real data in Phase 3
const mockJobs: Job[] = [
  {
    id: '1',
    customerName: 'John Smith',
    address: '123 Oak Street, Dallas, TX',
    scheduledDate: '2024-12-20',
    status: 'scheduled',
    amount: 450,
    description: 'Window installation - 3 windows',
  },
  {
    id: '2',
    customerName: 'Sarah Johnson',
    address: '456 Pine Ave, Fort Worth, TX',
    scheduledDate: '2024-12-21',
    status: 'scheduled',
    amount: 680,
    description: 'Door replacement',
  },
  {
    id: '3',
    customerName: 'Mike Williams',
    address: '789 Elm Blvd, Arlington, TX',
    scheduledDate: '2024-12-18',
    status: 'in_progress',
    amount: 520,
    description: 'Siding repair',
  },
  {
    id: '4',
    customerName: 'Emily Brown',
    address: '321 Maple Dr, Plano, TX',
    scheduledDate: '2024-12-15',
    status: 'completed',
    amount: 890,
    description: 'Roof repair',
  },
];

type FilterType = 'all' | 'scheduled' | 'in_progress' | 'completed';

function getStatusBadge(status: Job['status']) {
  switch (status) {
    case 'scheduled':
      return <Badge variant="info">Scheduled</Badge>;
    case 'in_progress':
      return <Badge variant="warning">In Progress</Badge>;
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
  }
}

export function JobsCardContent() {
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredJobs = filter === 'all'
    ? mockJobs
    : mockJobs.filter(job => job.status === filter);

  const activeJobs = mockJobs.filter(j => j.status !== 'completed').length;
  const totalValue = filteredJobs.reduce((sum, job) => sum + job.amount, 0);

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['all', 'scheduled', 'in_progress', 'completed'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-colors
              ${filter === f
                ? 'bg-gold text-black font-medium'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}
            `}
          >
            {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Stats Row */}
      <div className="flex gap-4 text-sm">
        <div>
          <span className="text-gray-400">Active: </span>
          <span className="text-white font-medium">{activeJobs}</span>
        </div>
        <div>
          <span className="text-gray-400">Value: </span>
          <span className="text-gold font-medium">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      {/* Jobs List */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {filteredJobs.length === 0 ? (
          <p className="text-center text-gray-500 py-4 text-sm">No jobs found</p>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className="p-3 bg-gray-800/50 rounded-lg space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-white font-medium text-sm truncate">
                      {job.customerName}
                    </p>
                    {getStatusBadge(job.status)}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{job.description}</p>
                </div>
                <p className="text-gold font-semibold text-sm whitespace-nowrap">
                  {formatCurrency(job.amount)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{job.address}</span>
                </div>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

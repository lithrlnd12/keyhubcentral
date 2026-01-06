'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Wrench, ClipboardList, Building2, MapPin, Calendar, AlertTriangle } from 'lucide-react';
import { useLaborRequests, usePartnerTickets } from '@/lib/hooks';
import { LaborRequestStatus, PartnerTicketStatus, getLaborRequestStatusLabel, getPartnerTicketStatusLabel, Urgency } from '@/types/partner';
import { Spinner } from '@/components/ui/Spinner';

type FilterType = 'all' | 'labor' | 'service';
type StatusFilter = 'all' | 'new' | 'in_progress' | 'complete';

const LABOR_STATUS_COLORS: Record<LaborRequestStatus, string> = {
  new: 'bg-yellow-500/20 text-yellow-400',
  reviewed: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-purple-500/20 text-purple-400',
  assigned: 'bg-indigo-500/20 text-indigo-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  complete: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

const TICKET_STATUS_COLORS: Record<PartnerTicketStatus, string> = {
  new: 'bg-yellow-500/20 text-yellow-400',
  reviewed: 'bg-blue-500/20 text-blue-400',
  assigned: 'bg-purple-500/20 text-purple-400',
  scheduled: 'bg-indigo-500/20 text-indigo-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  complete: 'bg-green-500/20 text-green-400',
};

const URGENCY_COLORS: Record<Urgency, string> = {
  low: 'text-gray-400',
  medium: 'text-yellow-400',
  high: 'text-orange-400',
  emergency: 'text-red-400',
};

export default function PartnerRequestsPage() {
  const { requests, loading: requestsLoading } = useLaborRequests({ realtime: true });
  const { tickets, loading: ticketsLoading } = usePartnerTickets({ realtime: true });

  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchInput, setSearchInput] = useState('');

  const loading = requestsLoading || ticketsLoading;

  // Combine and filter items
  const allItems = useMemo(() => {
    const laborItems = requests.map(r => ({
      ...r,
      itemType: 'labor' as const,
      number: r.requestNumber,
      statusLabel: getLaborRequestStatusLabel(r.status),
      statusColor: LABOR_STATUS_COLORS[r.status],
    }));

    const serviceItems = tickets.map(t => ({
      ...t,
      itemType: 'service' as const,
      number: t.ticketNumber,
      statusLabel: getPartnerTicketStatusLabel(t.status),
      statusColor: TICKET_STATUS_COLORS[t.status],
    }));

    let combined = [...laborItems, ...serviceItems];

    // Type filter
    if (typeFilter === 'labor') {
      combined = combined.filter(i => i.itemType === 'labor');
    } else if (typeFilter === 'service') {
      combined = combined.filter(i => i.itemType === 'service');
    }

    // Status filter
    if (statusFilter === 'new') {
      combined = combined.filter(i => i.status === 'new');
    } else if (statusFilter === 'in_progress') {
      combined = combined.filter(i => !['new', 'complete', 'cancelled'].includes(i.status));
    } else if (statusFilter === 'complete') {
      combined = combined.filter(i => ['complete', 'cancelled'].includes(i.status));
    }

    // Search filter
    if (searchInput) {
      const search = searchInput.toLowerCase();
      combined = combined.filter(
        i =>
          i.number.toLowerCase().includes(search) ||
          i.partnerCompany.toLowerCase().includes(search)
      );
    }

    // Sort by created date (newest first)
    return combined.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }, [requests, tickets, typeFilter, statusFilter, searchInput]);

  // Stats
  const newCount = [...requests, ...tickets].filter(i => i.status === 'new').length;
  const inProgressCount = [...requests, ...tickets].filter(
    i => !['new', 'complete', 'cancelled'].includes(i.status)
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Partner Requests</h1>
        <p className="text-gray-400">Manage labor requests and service tickets from partners</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">New Requests</p>
          <p className="text-2xl font-bold text-yellow-400">{loading ? '-' : newCount}</p>
        </div>
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">In Progress</p>
          <p className="text-2xl font-bold text-blue-400">{loading ? '-' : inProgressCount}</p>
        </div>
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Labor Requests</p>
          <p className="text-2xl font-bold text-gold">{loading ? '-' : requests.length}</p>
        </div>
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <p className="text-gray-400 text-sm">Service Tickets</p>
          <p className="text-2xl font-bold text-blue-500">{loading ? '-' : tickets.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by number or partner..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              typeFilter === 'all'
                ? 'bg-gold text-black'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setTypeFilter('labor')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              typeFilter === 'labor'
                ? 'bg-gold text-black'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <Wrench className="h-4 w-4" />
            Labor
          </button>
          <button
            onClick={() => setTypeFilter('service')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
              typeFilter === 'service'
                ? 'bg-gold text-black'
                : 'bg-gray-900 text-gray-400 hover:text-white'
            }`}
          >
            <ClipboardList className="h-4 w-4" />
            Service
          </button>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
        >
          <option value="all">All Statuses</option>
          <option value="new">New</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Completed</option>
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : allItems.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No requests found</h3>
          <p className="text-gray-400">Partner requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allItems.map((item) => (
            <Link
              key={item.id}
              href={
                item.itemType === 'labor'
                  ? `/admin/partner-requests/labor/${item.id}`
                  : `/admin/partner-requests/tickets/${item.id}`
              }
              className="flex items-center justify-between p-4 bg-brand-charcoal border border-gray-800 rounded-xl hover:border-gold/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  item.itemType === 'labor' ? 'bg-gold/10' : 'bg-blue-500/10'
                }`}>
                  {item.itemType === 'labor' ? (
                    <Wrench className="h-5 w-5 text-gold" />
                  ) : (
                    <ClipboardList className="h-5 w-5 text-blue-500" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-gold font-mono text-sm">{item.number}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${item.statusColor}`}>
                      {item.statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Building2 className="h-3 w-3" />
                    <span>{item.partnerCompany}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                {'crewSize' in item ? (
                  <div className="text-gray-400">
                    <span className="text-white">{item.crewSize}</span> crew
                  </div>
                ) : (
                  <div className={`flex items-center gap-1 ${URGENCY_COLORS[item.urgency]}`}>
                    <AlertTriangle className="h-4 w-4" />
                    <span className="capitalize">{item.urgency}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-gray-500">
                  <Calendar className="h-4 w-4" />
                  {item.createdAt.toDate().toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

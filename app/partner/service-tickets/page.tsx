'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, ClipboardList, MapPin, AlertTriangle, Calendar } from 'lucide-react';
import { useAuth, usePartnerTickets } from '@/lib/hooks';
import { PartnerTicketStatus, Urgency, getPartnerTicketStatusLabel, URGENCY_OPTIONS } from '@/types/partner';
import { Spinner } from '@/components/ui/Spinner';

const STATUS_COLORS: Record<PartnerTicketStatus, string> = {
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

export default function ServiceTicketsPage() {
  const { user } = useAuth();
  const partnerId = user?.partnerId || '';

  const {
    tickets,
    loading,
    error,
    filters,
    setStatus,
    setUrgency,
    setSearch,
  } = usePartnerTickets({
    realtime: true,
    initialFilters: { partnerId },
  });

  const [searchInput, setSearchInput] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Service Tickets</h1>
          <p className="text-gray-400">Manage warranty and service requests</p>
        </div>
        <Link
          href="/partner/service-tickets/new"
          className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </form>

        <select
          value={filters.status || ''}
          onChange={(e) => setStatus(e.target.value as PartnerTicketStatus | undefined || undefined)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="reviewed">Under Review</option>
          <option value="assigned">Assigned</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
        </select>

        <select
          value={filters.urgency || ''}
          onChange={(e) => setUrgency(e.target.value as Urgency | undefined || undefined)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
        >
          <option value="">All Urgencies</option>
          {URGENCY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm">
        {loading ? 'Loading...' : `${tickets.length} ticket${tickets.length !== 1 ? 's' : ''}`}
      </p>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No service tickets</h3>
          <p className="text-gray-400 mb-4">Submit your first service ticket to get started</p>
          <Link
            href="/partner/service-tickets/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Ticket
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/partner/service-tickets/${ticket.id}`}
              className="bg-brand-charcoal border border-gray-800 rounded-xl p-4 hover:border-gold/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-gold font-mono text-sm">{ticket.ticketNumber}</p>
                  <p className="text-white font-medium mt-1">{ticket.customerName}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}>
                  {getPartnerTicketStatusLabel(ticket.status)}
                </span>
              </div>

              <p className="text-gray-400 text-sm line-clamp-2 mb-3">{ticket.issueDescription}</p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{ticket.serviceAddress.city}, {ticket.serviceAddress.state}</span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${URGENCY_COLORS[ticket.urgency]}`} />
                  <span className={URGENCY_COLORS[ticket.urgency]}>
                    {URGENCY_OPTIONS.find(o => o.value === ticket.urgency)?.label}
                  </span>
                </div>
                {ticket.scheduledDate && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>Scheduled: {ticket.scheduledDate.toDate().toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

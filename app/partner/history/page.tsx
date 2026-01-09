'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Wrench, ClipboardList, CheckCircle, Calendar } from 'lucide-react';
import { useAuth, useLaborRequests, usePartnerTickets } from '@/lib/hooks';
import { Spinner } from '@/components/ui/Spinner';
import { BackButton } from '@/components/ui';

type FilterType = 'all' | 'labor' | 'service';

export default function HistoryPage() {
  const { user } = useAuth();
  const partnerId = user?.partnerId || '';

  const { requests, loading: requestsLoading } = useLaborRequests({
    realtime: true,
    initialFilters: { partnerId },
  });

  const { tickets, loading: ticketsLoading } = usePartnerTickets({
    realtime: true,
    initialFilters: { partnerId },
  });

  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [searchInput, setSearchInput] = useState('');

  const loading = requestsLoading || ticketsLoading;

  // Combine and filter completed items
  const historyItems = useMemo(() => {
    const completedRequests = requests
      .filter(r => ['complete', 'cancelled'].includes(r.status))
      .map(r => ({
        ...r,
        itemType: 'labor' as const,
        number: r.requestNumber,
        title: `${r.workType} - ${r.crewSize} crew`,
        completedDate: r.completedAt || r.updatedAt,
      }));

    const completedTickets = tickets
      .filter(t => t.status === 'complete')
      .map(t => ({
        ...t,
        itemType: 'service' as const,
        number: t.ticketNumber,
        title: `${t.issueType} - ${t.customerName}`,
        completedDate: t.resolvedAt || t.updatedAt,
      }));

    let combined = [...completedRequests, ...completedTickets];

    // Type filter
    if (typeFilter === 'labor') {
      combined = combined.filter(i => i.itemType === 'labor');
    } else if (typeFilter === 'service') {
      combined = combined.filter(i => i.itemType === 'service');
    }

    // Search filter
    if (searchInput) {
      const search = searchInput.toLowerCase();
      combined = combined.filter(
        i =>
          i.number.toLowerCase().includes(search) ||
          i.title.toLowerCase().includes(search)
      );
    }

    // Sort by completion date
    return combined.sort((a, b) => b.completedDate.toMillis() - a.completedDate.toMillis());
  }, [requests, tickets, typeFilter, searchInput]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <BackButton href="/partner" />
        <div>
          <h1 className="text-2xl font-bold text-white">History</h1>
          <p className="text-gray-400">View your completed labor requests and service tickets</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search history..."
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
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm">
        {loading ? 'Loading...' : `${historyItems.length} completed item${historyItems.length !== 1 ? 's' : ''}`}
      </p>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : historyItems.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No completed items</h3>
          <p className="text-gray-400">Your completed labor requests and service tickets will appear here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {historyItems.map((item) => (
            <Link
              key={item.id}
              href={
                item.itemType === 'labor'
                  ? `/partner/labor-requests/${item.id}`
                  : `/partner/service-tickets/${item.id}`
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
                  <p className="text-gold font-mono text-sm">{item.number}</p>
                  <p className="text-white font-medium capitalize">{item.title}</p>
                </div>
              </div>

              <div className="text-right">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  item.status === 'complete'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {item.status === 'complete' ? 'Completed' : 'Cancelled'}
                </span>
                <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                  <Calendar className="h-3 w-3" />
                  {item.completedDate.toDate().toLocaleDateString()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

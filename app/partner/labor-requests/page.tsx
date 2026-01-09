'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, Wrench, MapPin, Users, Calendar } from 'lucide-react';
import { useAuth, useLaborRequests } from '@/lib/hooks';
import { LaborRequestStatus, WorkType, getLaborRequestStatusLabel, WORK_TYPE_OPTIONS } from '@/types/partner';
import { Spinner } from '@/components/ui/Spinner';
import { BackButton } from '@/components/ui';

const STATUS_COLORS: Record<LaborRequestStatus, string> = {
  new: 'bg-yellow-500/20 text-yellow-400',
  reviewed: 'bg-blue-500/20 text-blue-400',
  approved: 'bg-purple-500/20 text-purple-400',
  assigned: 'bg-indigo-500/20 text-indigo-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  complete: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
};

export default function LaborRequestsPage() {
  const { user } = useAuth();
  const partnerId = user?.partnerId || '';

  const {
    requests,
    loading,
    error,
    filters,
    setStatus,
    setWorkType,
    setSearch,
  } = useLaborRequests({
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
        <div className="flex items-center gap-4">
          <BackButton href="/partner" />
          <div>
            <h1 className="text-2xl font-bold text-white">Labor Requests</h1>
            <p className="text-gray-400">Manage your crew and installation requests</p>
          </div>
        </div>
        <Link
          href="/partner/labor-requests/new"
          className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Request
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </form>

        <select
          value={filters.status || ''}
          onChange={(e) => setStatus(e.target.value as LaborRequestStatus | undefined || undefined)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
        >
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="reviewed">Under Review</option>
          <option value="approved">Approved</option>
          <option value="assigned">Assigned</option>
          <option value="in_progress">In Progress</option>
          <option value="complete">Complete</option>
        </select>

        <select
          value={filters.workType || ''}
          onChange={(e) => setWorkType(e.target.value as WorkType | undefined || undefined)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
        >
          <option value="">All Types</option>
          {WORK_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm">
        {loading ? 'Loading...' : `${requests.length} request${requests.length !== 1 ? 's' : ''}`}
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
      ) : requests.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No labor requests</h3>
          <p className="text-gray-400 mb-4">Submit your first labor request to get started</p>
          <Link
            href="/partner/labor-requests/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Request
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <Link
              key={request.id}
              href={`/partner/labor-requests/${request.id}`}
              className="bg-brand-charcoal border border-gray-800 rounded-xl p-4 hover:border-gold/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-gold font-mono text-sm">{request.requestNumber}</p>
                  <p className="text-white font-medium mt-1 capitalize">{request.workType}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[request.status]}`}>
                  {getLaborRequestStatusLabel(request.status)}
                </span>
              </div>

              <p className="text-gray-400 text-sm line-clamp-2 mb-3">{request.description}</p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{request.location.city}, {request.location.state}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="h-4 w-4" />
                  <span>{request.crewSize} crew member{request.crewSize !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Calendar className="h-4 w-4" />
                  <span>Needed: {request.dateNeeded.toDate().toLocaleDateString()}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

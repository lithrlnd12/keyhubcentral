'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Building2, MapPin, CheckCircle, XCircle } from 'lucide-react';
import { usePartners } from '@/lib/hooks';
import { PartnerStatus } from '@/types/partner';
import { updatePartnerStatus, approvePartner } from '@/lib/firebase/partners';
import { useAuth } from '@/lib/hooks';
import { Spinner } from '@/components/ui/Spinner';

const STATUS_COLORS: Record<PartnerStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  active: 'bg-green-500/20 text-green-400',
  inactive: 'bg-gray-500/20 text-gray-400',
  suspended: 'bg-red-500/20 text-red-400',
};

export default function PartnersPage() {
  const { user } = useAuth();
  const {
    partners,
    loading,
    error,
    filters,
    setStatus,
    setSearch,
    refetch,
  } = usePartners({ realtime: true });

  const [searchInput, setSearchInput] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleApprove = async (partnerId: string) => {
    if (!user) return;
    setProcessingId(partnerId);
    try {
      await approvePartner(partnerId, user.uid);
      await refetch();
    } catch (err) {
      console.error('Failed to approve partner:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleSuspend = async (partnerId: string) => {
    setProcessingId(partnerId);
    try {
      await updatePartnerStatus(partnerId, 'suspended');
      await refetch();
    } catch (err) {
      console.error('Failed to suspend partner:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (partnerId: string) => {
    setProcessingId(partnerId);
    try {
      await updatePartnerStatus(partnerId, 'active');
      await refetch();
    } catch (err) {
      console.error('Failed to activate partner:', err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Partner Companies</h1>
          <p className="text-gray-400">Manage external partner companies</p>
        </div>
        <Link
          href="/admin/partners/new"
          className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Partner
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search partners..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </form>

        <select
          value={filters.status || ''}
          onChange={(e) => setStatus(e.target.value as PartnerStatus | undefined || undefined)}
          className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-gray-400 text-sm">
        {loading ? 'Loading...' : `${partners.length} partner${partners.length !== 1 ? 's' : ''}`}
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
      ) : partners.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No partners</h3>
          <p className="text-gray-400 mb-4">Add your first partner company</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {partners.map((partner) => (
            <div
              key={partner.id}
              className="bg-brand-charcoal border border-gray-800 rounded-xl p-4 hover:border-gold/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gold/10 rounded-lg">
                    <Building2 className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{partner.companyName}</p>
                    <p className="text-gray-400 text-sm">{partner.contactName}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[partner.status]}`}>
                  {partner.status}
                </span>
              </div>

              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center gap-2 text-gray-400">
                  <MapPin className="h-4 w-4" />
                  <span>{partner.address.city}, {partner.address.state}</span>
                </div>
                <p className="text-gray-400">{partner.contactEmail}</p>
                <p className="text-gray-400">{partner.contactPhone}</p>
              </div>

              <div className="flex gap-2">
                <Link
                  href={`/admin/partners/${partner.id}`}
                  className="flex-1 px-3 py-2 text-center border border-gray-800 rounded-lg text-white text-sm hover:bg-gray-900 transition-colors"
                >
                  View Details
                </Link>

                {partner.status === 'pending' && (
                  <button
                    onClick={() => handleApprove(partner.id)}
                    disabled={processingId === partner.id}
                    className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}

                {partner.status === 'active' && (
                  <button
                    onClick={() => handleSuspend(partner.id)}
                    disabled={processingId === partner.id}
                    className="px-3 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}

                {partner.status === 'suspended' && (
                  <button
                    onClick={() => handleActivate(partner.id)}
                    disabled={processingId === partner.id}
                    className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

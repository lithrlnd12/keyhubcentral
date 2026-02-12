'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Wrench, ClipboardList, Clock, CheckCircle } from 'lucide-react';
import { useAuth, useLaborRequests, usePartnerTickets } from '@/lib/hooks';
import { ContractorNetworkMap } from '@/components/maps/ContractorNetworkMap';

interface MapContractor {
  id: string;
  businessName: string | null;
  trades: string[];
  lat: number;
  lng: number;
  city: string;
  state: string;
  serviceRadius: number;
}

export default function PartnerDashboard() {
  const { user, getIdToken } = useAuth();
  const partnerId = user?.partnerId || '';

  const { requests, loading: requestsLoading } = useLaborRequests({
    realtime: true,
    initialFilters: { partnerId },
  });

  const { tickets, loading: ticketsLoading } = usePartnerTickets({
    realtime: true,
    initialFilters: { partnerId },
  });

  const loading = requestsLoading || ticketsLoading;

  // Fetch contractor locations for network map
  const [mapContractors, setMapContractors] = useState<MapContractor[]>([]);
  const [mapLoading, setMapLoading] = useState(true);

  useEffect(() => {
    async function fetchContractors() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch('/api/contractors/map', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMapContractors(data.contractors || []);
        }
      } catch (err) {
        console.error('Failed to fetch contractor map data:', err);
      } finally {
        setMapLoading(false);
      }
    }
    fetchContractors();
  }, [getIdToken]);

  // Calculate stats
  const openRequests = requests.filter(r => !['complete', 'cancelled'].includes(r.status)).length;
  const pendingTickets = tickets.filter(t => !['complete'].includes(t.status)).length;
  const completedThisMonth = [...requests, ...tickets].filter(item => {
    const completedAt = 'completedAt' in item ? item.completedAt : item.resolvedAt;
    if (!completedAt) return false;
    const date = completedAt.toDate();
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;

  // Recent activity (last 5 items)
  const recentActivity = [...requests, ...tickets]
    .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="text-gray-400">Manage your labor requests and service tickets</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/partner/labor-requests/new"
          className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 hover:border-gold/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gold/10 rounded-lg group-hover:bg-gold/20 transition-colors">
              <Wrench className="h-6 w-6 text-gold" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Submit Labor Request
                <Plus className="h-4 w-4" />
              </h3>
              <p className="text-gray-400 text-sm">Request crew for installations or work</p>
            </div>
          </div>
        </Link>

        <Link
          href="/partner/service-tickets/new"
          className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 hover:border-gold/50 transition-colors group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 transition-colors">
              <ClipboardList className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                Submit Service Ticket
                <Plus className="h-4 w-4" />
              </h3>
              <p className="text-gray-400 text-sm">Report warranty or service issues</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Wrench className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Open Requests</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '-' : openRequests}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <ClipboardList className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Pending Tickets</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '-' : pendingTickets}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Completed (Month)</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '-' : completedThisMonth}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <p className="text-gray-400 text-xs">Total Submissions</p>
              <p className="text-2xl font-bold text-white">
                {loading ? '-' : requests.length + tickets.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* KTS Employee Network Map */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">KTS Employee Network</h2>
        <ContractorNetworkMap
          contractors={mapContractors}
          loading={mapLoading}
          className="h-[400px]"
        />
        {!mapLoading && mapContractors.length === 0 && (
          <p className="text-gray-500 text-sm text-center mt-3">No contractor locations available</p>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Activity</h2>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-gold border-t-transparent rounded-full" />
          </div>
        ) : recentActivity.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No activity yet. Submit your first request!</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((item) => {
              const isRequest = 'requestNumber' in item;
              const number = isRequest ? item.requestNumber : item.ticketNumber;
              const href = isRequest
                ? `/partner/labor-requests/${item.id}`
                : `/partner/service-tickets/${item.id}`;

              return (
                <Link
                  key={item.id}
                  href={href}
                  className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isRequest ? (
                      <Wrench className="h-4 w-4 text-gold" />
                    ) : (
                      <ClipboardList className="h-4 w-4 text-blue-500" />
                    )}
                    <div>
                      <p className="text-white font-medium text-sm">{number}</p>
                      <p className="text-gray-400 text-xs">
                        {isRequest ? 'Labor Request' : 'Service Ticket'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    item.status === 'complete'
                      ? 'bg-green-500/20 text-green-400'
                      : item.status === 'new'
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

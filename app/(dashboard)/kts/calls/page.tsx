'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useInboundCalls, useNewCallsCount } from '@/lib/hooks';
import { InboundCallFilters, InboundCallList } from '@/components/inboundCalls';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { EmptyState } from '@/components/ui/EmptyState';
import { LiveCallDashboard } from '@/components/calls/LiveCallDashboard';
import { CallQueueView } from '@/components/calls/CallQueueView';
import { ShieldAlert } from 'lucide-react';

function InboundCallsTab() {
  const {
    calls,
    loading,
    error,
    filters,
    setStatus,
    setSearch,
    setFilters,
  } = useInboundCalls({
    realtime: true,
    initialFilters: {
      excludeStatuses: ['converted', 'closed'],
    },
  });

  const handleClearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-4">
      <InboundCallFilters
        filters={filters}
        onStatusChange={setStatus}
        onSearchChange={setSearch}
        onClear={handleClearFilters}
      />
      <InboundCallList
        calls={calls}
        loading={loading}
        error={error}
      />
    </div>
  );
}

export default function CallCenterPage() {
  const { user } = useAuth();
  const { count: newCallsCount } = useNewCallsCount();

  const userRole = (user as Record<string, unknown> | null)?.role as string | undefined;
  const isAdmin = userRole === 'owner' || userRole === 'admin';
  const hasAccess = isAdmin || userRole === 'pm';

  if (!hasAccess) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Access Denied"
        description="You do not have permission to view the Call Center. Contact an admin for access."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white">Inbound Calls</h2>
            {newCallsCount > 0 && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full">
                {newCallsCount} new
              </span>
            )}
          </div>
          <p className="text-gray-400 mt-1">
            Review incoming calls, manage the queue, and view call history.
          </p>
        </div>
      </div>

      {/* Tabs — Inbound Calls is the default view */}
      <Tabs defaultValue="inbound">
        <TabsList>
          <TabsTrigger value="inbound">Inbound Calls</TabsTrigger>
          <TabsTrigger value="live">Live Calls</TabsTrigger>
          <TabsTrigger value="queue">Call Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="inbound">
          <InboundCallsTab />
        </TabsContent>

        <TabsContent value="live">
          <LiveCallDashboard />
        </TabsContent>

        <TabsContent value="queue">
          <CallQueueView />
        </TabsContent>

        {/* Call History and Routing Rules removed from tabs:
            - Call history is now shown in context on each job's Activity tab
            - Routing rules are developer config via Firestore routingRules collection */}
      </Tabs>
    </div>
  );
}

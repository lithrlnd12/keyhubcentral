'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/useAuth';
import { useInboundCalls, useNewCallsCount } from '@/lib/hooks';
import { InboundCallFilters, InboundCallList } from '@/components/inboundCalls';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { LiveCallDashboard } from '@/components/calls/LiveCallDashboard';
import { CallQueueView } from '@/components/calls/CallQueueView';
import { CallRecordingPlayer } from '@/components/calls/CallRecordingPlayer';
import { Phone, History, ShieldAlert } from 'lucide-react';

interface VoiceCallRecord {
  id: string;
  callerName?: string;
  callerPhone?: string;
  callType?: string;
  status?: string;
  outcome?: string;
  duration?: number;
  recordingUrl?: string;
  createdAt?: { seconds: number; nanoseconds: number } | null;
}

function formatCallDate(timestamp?: { seconds: number; nanoseconds: number } | null): string {
  if (!timestamp?.seconds) return '';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Retained for future use — call history now shown on job Activity tabs
function _CallHistoryTab() {
  const [calls, setCalls] = useState<VoiceCallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCallHistory() {
      try {
        const q = query(
          collection(db, 'voiceCalls'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as VoiceCallRecord[];
        setCalls(data);
      } catch (err) {
        console.error('Error fetching call history:', err);
        setCalls([]);
      } finally {
        setLoading(false);
      }
    }
    fetchCallHistory();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No call history"
        description="Completed calls will appear here with recordings and details."
      />
    );
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => (
        <Card key={call.id} padding="sm">
          <div className="flex flex-col gap-3">
            {/* Call info row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-medium truncate">
                    {call.callerName || call.callerPhone || 'Unknown'}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {call.callType && (
                      <Badge variant="info">
                        {call.callType.replace(/_/g, ' ')}
                      </Badge>
                    )}
                    {call.outcome && (
                      <Badge
                        variant={
                          call.outcome === 'answered' || call.outcome === 'completed'
                            ? 'success'
                            : call.outcome === 'failed'
                            ? 'error'
                            : 'default'
                        }
                      >
                        {call.outcome}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-sm text-gray-400">{formatCallDate(call.createdAt)}</p>
                <p className="text-xs text-gray-500">{formatDuration(call.duration)}</p>
              </div>
            </div>

            {/* Recording player */}
            {call.recordingUrl && (
              <CallRecordingPlayer
                recordingUrl={call.recordingUrl}
                callId={call.id}
                duration={call.duration}
              />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

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

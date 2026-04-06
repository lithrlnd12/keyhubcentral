'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Phone, PhoneOff } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';

interface ActiveCall {
  id: string;
  callerName?: string;
  callerPhone?: string;
  callType?: string;
  assistantType?: string;
  status: string;
  startedAt?: { seconds: number; nanoseconds: number } | null;
  createdAt?: { seconds: number; nanoseconds: number } | null;
}

function CallDurationTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const update = () => {
      setElapsed(Math.floor((Date.now() / 1000) - startTime));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="text-brand-gold font-mono text-sm">
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  );
}

function getCallTypeLabel(callType?: string): string {
  if (!callType) return 'Unknown';
  const labels: Record<string, string> = {
    dispatch: 'Dispatch',
    lead_call: 'Lead Call',
    appointment_reminder: 'Appointment Reminder',
    compliance_reminder: 'Compliance Reminder',
    quote_followup: 'Quote Follow-up',
    rating_call: 'Rating Call',
    verification: 'Verification',
  };
  return labels[callType] || callType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getCallTypeBadgeVariant(callType?: string) {
  switch (callType) {
    case 'dispatch':
      return 'warning' as const;
    case 'lead_call':
      return 'info' as const;
    case 'appointment_reminder':
      return 'success' as const;
    default:
      return 'default' as const;
  }
}

export function LiveCallDashboard() {
  const [activeCalls, setActiveCalls] = useState<ActiveCall[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'voiceCalls'),
      where('status', '==', 'in_progress')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const calls = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ActiveCall[];
        setActiveCalls(calls);
        setLoading(false);
      },
      (error) => {
        console.error('Error subscribing to active calls:', error);
        setActiveCalls([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${activeCalls.length > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-sm font-medium text-gray-300">
            {activeCalls.length} active call{activeCalls.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {activeCalls.length === 0 ? (
        <EmptyState
          icon={PhoneOff}
          title="No active calls"
          description="Active calls will appear here in real-time when agents are on the phone."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCalls.map((call) => {
            const startTimestamp = call.startedAt?.seconds || call.createdAt?.seconds || 0;

            return (
              <Card key={call.id} padding="md" className="relative">
                {/* Live indicator */}
                <div className="absolute top-4 right-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs text-green-400 font-medium">LIVE</span>
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Caller info */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-gold/10 rounded-full flex items-center justify-center">
                      <Phone className="w-5 h-5 text-brand-gold" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {call.callerName || 'Unknown Caller'}
                      </p>
                      <p className="text-sm text-gray-400 truncate">
                        {call.callerPhone || 'No phone'}
                      </p>
                    </div>
                  </div>

                  {/* Call details */}
                  <div className="flex items-center justify-between">
                    <Badge variant={getCallTypeBadgeVariant(call.callType)}>
                      {getCallTypeLabel(call.callType)}
                    </Badge>
                    {startTimestamp > 0 && (
                      <CallDurationTimer startTime={startTimestamp} />
                    )}
                  </div>

                  {/* Assistant type */}
                  {call.assistantType && (
                    <p className="text-xs text-gray-500">
                      Agent: {call.assistantType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Phone,
  Star,
  Bell,
  Users,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Voicemail,
  ExternalLink,
} from 'lucide-react';
import { tenant } from '@/lib/config/tenant';

interface ActivityItem {
  id: string;
  type: 'rating_call' | 'appointment_reminder' | 'dispatch' | 'rating_result' | 'compliance';
  title: string;
  description: string;
  status: 'success' | 'failed' | 'pending' | 'completed' | 'no_answer' | 'voicemail';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface JobActivityFeedProps {
  jobId: string;
  jobNumber: string;
  contractorIds?: string[];
}

const ACTIVITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  rating_call: Star,
  appointment_reminder: Bell,
  dispatch: Users,
  rating_result: Star,
  compliance: Phone,
};

const STATUS_CONFIG: Record<string, { color: string; variant: 'success' | 'error' | 'warning' | 'info' | 'default'; label: string }> = {
  success: { color: 'text-green-400', variant: 'success', label: 'Completed' },
  completed: { color: 'text-green-400', variant: 'success', label: 'Completed' },
  failed: { color: 'text-red-400', variant: 'error', label: 'Failed' },
  pending: { color: 'text-yellow-400', variant: 'warning', label: 'Pending' },
  no_answer: { color: 'text-orange-400', variant: 'warning', label: 'No Answer' },
  voicemail: { color: 'text-blue-400', variant: 'info', label: 'Voicemail' },
};

function formatTimestamp(date: Date): string {
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function JobActivityFeed({ jobId, jobNumber, contractorIds }: JobActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivities() {
      const items: ActivityItem[] = [];

      try {
        // 1. Rating requests for this job
        const ratingsQuery = query(
          collection(db, 'ratingRequests'),
          where('jobId', '==', jobId),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const ratingsSnap = await getDocs(ratingsQuery);
        for (const doc of ratingsSnap.docs) {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date();

          if (data.status === 'completed' && data.rating) {
            items.push({
              id: `rating-result-${doc.id}`,
              type: 'rating_result',
              title: `Customer rated ${data.rating}/5`,
              description: data.comment || `${data.customerName} left a ${data.rating}-star rating`,
              status: 'completed',
              timestamp: data.completedAt?.toDate?.() || createdAt,
              metadata: { rating: data.rating, comment: data.comment, googleReviewPrompted: data.rating >= 4 },
            });
          }

          items.push({
            id: `rating-call-${doc.id}`,
            type: 'rating_call',
            title: 'Rating call sent',
            description: `Rating request sent to ${data.customerName} (${data.customerEmail})`,
            status: data.status === 'completed' ? 'success' : data.status === 'expired' ? 'failed' : 'pending',
            timestamp: createdAt,
            metadata: { customerName: data.customerName, token: data.token },
          });
        }

        // 2. Voice calls linked to this job (dispatch, reminders, etc.)
        const callsQuery = query(
          collection(db, 'voiceCalls'),
          where('jobId', '==', jobId),
          orderBy('createdAt', 'desc'),
          limit(20)
        );
        const callsSnap = await getDocs(callsQuery);
        for (const doc of callsSnap.docs) {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date();
          const callType = data.callType || data.type || 'unknown';
          const outcome = data.outcome || data.status || 'pending';

          if (callType === 'dispatch' || data.dispatchSessionId) {
            items.push({
              id: `dispatch-${doc.id}`,
              type: 'dispatch',
              title: `Dispatch call to ${data.contractorName || 'contractor'}`,
              description: outcome === 'answered'
                ? `${data.contractorName || 'Contractor'} accepted the job`
                : outcome === 'voicemail'
                ? `Left voicemail for ${data.contractorName || 'contractor'}`
                : outcome === 'no_answer'
                ? `${data.contractorName || 'Contractor'} didn't answer`
                : `Dispatch call ${outcome}`,
              status: outcome === 'answered' ? 'success' : outcome as ActivityItem['status'],
              timestamp: createdAt,
              metadata: { contractorName: data.contractorName, duration: data.duration },
            });
          } else if (callType === 'appointment_reminder' || callType === 'reminder') {
            items.push({
              id: `reminder-${doc.id}`,
              type: 'appointment_reminder',
              title: 'Appointment reminder sent',
              description: outcome === 'answered'
                ? 'Customer confirmed the appointment'
                : outcome === 'voicemail'
                ? 'Left voicemail reminder'
                : `Reminder call ${outcome}`,
              status: outcome === 'answered' ? 'success' : outcome as ActivityItem['status'],
              timestamp: createdAt,
              metadata: { duration: data.duration },
            });
          } else if (callType === 'rating' || callType === 'rating_call') {
            // Voice-based rating call (different from email rating request)
            items.push({
              id: `voice-rating-${doc.id}`,
              type: 'rating_call',
              title: 'Rating call made',
              description: outcome === 'answered'
                ? 'Customer provided feedback via phone'
                : `Rating call ${outcome}`,
              status: outcome === 'answered' ? 'success' : outcome as ActivityItem['status'],
              timestamp: createdAt,
              metadata: { duration: data.duration, recordingUrl: data.recordingUrl },
            });
          }
        }
      } catch (err) {
        console.error('Error fetching job activities:', err);
      }

      // Sort by timestamp descending
      items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      setActivities(items);
      setLoading(false);
    }

    fetchActivities();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No automated activity yet"
        description="Rating calls, appointment reminders, and dispatch activity will appear here as they happen."
      />
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICONS[activity.type] || Phone;
        const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG.pending;

        return (
          <Card key={activity.id} padding="sm">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                activity.type === 'rating_result' ? 'bg-yellow-500/20' :
                activity.type === 'dispatch' ? 'bg-blue-500/20' :
                activity.type === 'appointment_reminder' ? 'bg-purple-500/20' :
                'bg-gray-800'
              }`}>
                <Icon className={`w-4 h-4 ${
                  activity.type === 'rating_result' ? 'text-yellow-400' :
                  activity.type === 'dispatch' ? 'text-blue-400' :
                  activity.type === 'appointment_reminder' ? 'text-purple-400' :
                  'text-gray-400'
                }`} />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-white font-medium text-sm">{activity.title}</p>
                  <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                </div>
                <p className="text-gray-400 text-sm mt-0.5">{activity.description}</p>

                {/* Rating stars */}
                {activity.type === 'rating_result' && typeof activity.metadata?.rating === 'number' && (
                  <div className="flex items-center gap-1 mt-1.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (activity.metadata!.rating as number)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-600'
                        }`}
                      />
                    ))}
                    {typeof activity.metadata?.comment === 'string' && (
                      <span className="text-gray-400 text-xs ml-2 italic">
                        &ldquo;{activity.metadata.comment}&rdquo;
                      </span>
                    )}
                  </div>
                )}

                {/* Google review prompt indicator */}
                {activity.type === 'rating_result' && (activity.metadata?.rating as number) >= 4 && tenant.googleReviewUrl && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <ExternalLink className="w-3 h-3 text-green-400" />
                    <span className="text-green-400 text-xs">Google review prompted</span>
                  </div>
                )}
              </div>

              {/* Timestamp */}
              <span className="text-xs text-gray-500 flex-shrink-0">
                {formatTimestamp(activity.timestamp)}
              </span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

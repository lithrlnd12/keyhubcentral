'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Lead, LeadQuality } from '@/types/lead';
import { CallQueueItem } from '@/types/callCenter';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { Phone, PhoneForwarded, SkipForward, ListOrdered } from 'lucide-react';

function qualityBadgeVariant(quality: LeadQuality) {
  switch (quality) {
    case 'hot':
      return 'error' as const;
    case 'warm':
      return 'warning' as const;
    case 'cold':
      return 'info' as const;
    default:
      return 'default' as const;
  }
}

function qualityPriority(quality: LeadQuality): number {
  switch (quality) {
    case 'hot':
      return 0;
    case 'warm':
      return 1;
    case 'cold':
      return 2;
    default:
      return 3;
  }
}

function formatScheduledTime(scheduledAt?: string): string {
  if (!scheduledAt) return '';
  try {
    const date = new Date(scheduledAt);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return scheduledAt;
  }
}

export function CallQueueView() {
  const [queueItems, setQueueItems] = useState<CallQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState<string | null>(null);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  const fetchQueueLeads = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch leads that are new or assigned with autoCallEnabled
      const newLeadsQuery = query(
        collection(db, 'leads'),
        where('status', 'in', ['new', 'assigned']),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(newLeadsQuery);
      const leads = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Lead[];

      // Filter: has scheduledCallAt OR autoCallEnabled
      const eligibleLeads = leads.filter(
        (lead) => lead.scheduledCallAt || lead.autoCallEnabled
      );

      // Map to queue items
      const items: CallQueueItem[] = eligibleLeads.map((lead) => {
        const scheduledAt = lead.scheduledCallAt
          ? (lead.scheduledCallAt as Timestamp).toDate().toISOString()
          : undefined;

        return {
          leadId: lead.id,
          leadName: lead.customer.name || 'Unknown',
          phone: lead.customer.phone || '',
          quality: lead.quality,
          source: lead.source,
          scheduledAt,
          priority: qualityPriority(lead.quality),
        };
      });

      // Sort: hot leads first, then by scheduledAt (soonest), then by priority
      items.sort((a, b) => {
        // First by quality priority
        if (a.priority !== b.priority) return a.priority - b.priority;

        // Then by scheduled time (soonest first, items without scheduled time go last)
        if (a.scheduledAt && b.scheduledAt) {
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        }
        if (a.scheduledAt && !b.scheduledAt) return -1;
        if (!a.scheduledAt && b.scheduledAt) return 1;

        return 0;
      });

      setQueueItems(items);
    } catch (err) {
      console.error('Error fetching call queue:', err);
      setError('Failed to load call queue');
      setQueueItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueueLeads();
  }, [fetchQueueLeads]);

  const handleCallNow = async (leadId: string) => {
    try {
      setCallingId(leadId);
      const response = await fetch('/api/voice/call-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate call');
      }
    } catch (err) {
      console.error('Error initiating call:', err);
      setError(err instanceof Error ? err.message : 'Failed to initiate call');
    } finally {
      setCallingId(null);
    }
  };

  const handleSkip = (leadId: string) => {
    setSkippedIds((prev) => new Set(prev).add(leadId));
  };

  const visibleItems = queueItems.filter((item) => !skippedIds.has(item.leadId));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListOrdered className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">
            {visibleItems.length} lead{visibleItems.length !== 1 ? 's' : ''} in queue
          </span>
        </div>
        {skippedIds.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSkippedIds(new Set())}
          >
            Reset skipped ({skippedIds.size})
          </Button>
        )}
      </div>

      {error && (
        <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {visibleItems.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="No leads in queue"
          description="Leads with scheduled calls or auto-call enabled will appear here."
        />
      ) : (
        <div className="space-y-2">
          {visibleItems.map((item, index) => (
            <Card key={item.leadId} padding="sm" className="flex items-center gap-4">
              {/* Queue position */}
              <span className="text-lg font-bold text-gray-600 w-8 text-center flex-shrink-0">
                {index + 1}
              </span>

              {/* Lead info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white font-medium truncate">{item.leadName}</span>
                  <Badge variant={qualityBadgeVariant(item.quality)}>
                    {item.quality}
                  </Badge>
                  <Badge variant="default">
                    {item.source.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-400">{item.phone}</span>
                  {item.scheduledAt && (
                    <span className="text-xs text-brand-gold">
                      Scheduled: {formatScheduledTime(item.scheduledAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSkip(item.leadId)}
                  title="Skip"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  loading={callingId === item.leadId}
                  onClick={() => handleCallNow(item.leadId)}
                  disabled={!item.phone}
                >
                  <PhoneForwarded className="w-4 h-4 mr-1.5" />
                  Call Now
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

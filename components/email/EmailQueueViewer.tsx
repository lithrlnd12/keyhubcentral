'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { QueuedEmail } from '@/types/emailTemplate';
import { getEmailHistory } from '@/lib/email/emailQueue';
import { Timestamp } from 'firebase/firestore';
import { Mail, RefreshCw, Send, AlertCircle } from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; variant: BadgeVariant }> = {
  pending: { label: 'Pending', variant: 'warning' },
  sent: { label: 'Sent', variant: 'success' },
  failed: { label: 'Failed', variant: 'error' },
};

function formatTimestamp(ts: Timestamp | null | undefined): string {
  if (!ts) return '-';
  try {
    const date = ts.toDate();
    return date.toLocaleString();
  } catch {
    return '-';
  }
}

export function EmailQueueViewer() {
  const [emails, setEmails] = useState<QueuedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<{
    sent: number;
    failed: number;
  } | null>(null);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    try {
      const history = await getEmailHistory(50);
      setEmails(history);
    } catch (err) {
      console.error('Failed to load email queue:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  const handleProcessQueue = async () => {
    setProcessing(true);
    setProcessResult(null);
    try {
      const res = await fetch('/api/email/send-queued', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || ''}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process queue');
      }

      const result = await res.json();
      setProcessResult(result);
      // Reload the queue after processing
      await loadEmails();
    } catch (err) {
      console.error('Failed to process queue:', err);
      setProcessResult({ sent: 0, failed: -1 });
    } finally {
      setProcessing(false);
    }
  };

  const pendingCount = emails.filter((e) => e.status === 'pending').length;

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-medium text-gray-400">
            {emails.length} emails &middot; {pendingCount} pending
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={loadEmails} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleProcessQueue}
            loading={processing}
            disabled={pendingCount === 0}
          >
            <Send className="w-4 h-4 mr-1" /> Process Queue
          </Button>
        </div>
      </div>

      {/* Process result */}
      {processResult && (
        <div
          className={`p-3 rounded-lg text-sm ${
            processResult.failed === -1
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-green-500/10 border border-green-500/30 text-green-400'
          }`}
        >
          {processResult.failed === -1
            ? 'Failed to process the email queue. Check server configuration.'
            : `Processed: ${processResult.sent} sent, ${processResult.failed} failed.`}
        </div>
      )}

      {/* Email list */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-brand-charcoal rounded-xl animate-pulse" />
          ))}
        </div>
      ) : emails.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="No Emails in Queue"
          description="When email automations trigger, queued emails will appear here."
        />
      ) : (
        <div className="space-y-2">
          {emails.map((email) => {
            const config = STATUS_CONFIG[email.status] || STATUS_CONFIG.pending;
            return (
              <Card key={email.id} padding="sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white truncate">
                        {email.subject}
                      </span>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>To: {email.recipientName || email.recipientEmail}</span>
                      <span>&middot;</span>
                      <span>Scheduled: {formatTimestamp(email.scheduledFor)}</span>
                      {email.sentAt && (
                        <>
                          <span>&middot;</span>
                          <span>Sent: {formatTimestamp(email.sentAt)}</span>
                        </>
                      )}
                    </div>
                    {email.error && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-red-400">
                        <AlertCircle className="w-3 h-3" />
                        {email.error}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

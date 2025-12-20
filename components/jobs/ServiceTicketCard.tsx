'use client';

import Link from 'next/link';
import { ServiceTicket, ServiceTicketStatus } from '@/types/job';
import { Card, CardContent } from '@/components/ui/Card';
import { formatDistanceToNow } from '@/lib/utils/formatters';
import { AlertCircle, User, Calendar, ChevronRight, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface ServiceTicketCardProps {
  ticket: ServiceTicket;
  showJobLink?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  ServiceTicketStatus,
  { label: string; bg: string; text: string }
> = {
  new: { label: 'New', bg: 'bg-red-500/20', text: 'text-red-400' },
  assigned: { label: 'Assigned', bg: 'bg-blue-500/20', text: 'text-blue-400' },
  scheduled: { label: 'Scheduled', bg: 'bg-purple-500/20', text: 'text-purple-400' },
  in_progress: { label: 'In Progress', bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
  complete: { label: 'Complete', bg: 'bg-green-500/20', text: 'text-green-400' },
};

export function ServiceTicketCard({
  ticket,
  showJobLink = false,
  className,
}: ServiceTicketCardProps) {
  const statusConfig = STATUS_CONFIG[ticket.status];

  return (
    <Card className={cn('hover:border-gray-600 transition-colors', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white font-semibold">{ticket.ticketNumber}</span>
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  statusConfig.bg,
                  statusConfig.text
                )}
              >
                {statusConfig.label}
              </span>
            </div>

            {/* Issue */}
            <p className="text-gray-300 text-sm mb-3 line-clamp-2">{ticket.issue}</p>

            {/* Customer & Meta */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {ticket.customer.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {ticket.createdAt
                  ? formatDistanceToNow(ticket.createdAt.toDate())
                  : 'Just now'}
              </span>
              {ticket.status === 'complete' && ticket.resolvedAt && (
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle className="w-3.5 h-3.5" />
                  Resolved {formatDistanceToNow(ticket.resolvedAt.toDate())}
                </span>
              )}
            </div>

            {/* Resolution */}
            {ticket.resolution && (
              <div className="mt-2 p-2 bg-green-500/10 rounded border border-green-500/20">
                <p className="text-green-400 text-sm">{ticket.resolution}</p>
              </div>
            )}
          </div>

          {/* Link arrow */}
          {showJobLink && (
            <Link
              href={`/kr/${ticket.jobId}`}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

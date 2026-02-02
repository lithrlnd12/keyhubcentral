'use client';

import { useState } from 'react';
import { X, Calendar, Settings, ExternalLink, MapPin, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Job } from '@/types/job';
import { GoogleCalendarEvent } from '@/lib/hooks/useGoogleCalendarEvents';
import {
  BlockStatus,
  TimeBlock,
  AvailabilityStatus,
  TIME_BLOCKS,
  TIME_BLOCK_CONFIG,
  getAvailabilityInfo,
  getDefaultBlocks,
} from '@/types/availability';
import { CalendarJobCard } from './CalendarJobCard';

interface CalendarDayDetailProps {
  date: Date;
  jobs: Job[];
  availability: BlockStatus | null;
  googleCalendarEvents?: GoogleCalendarEvent[];
  onClose: () => void;
  onAvailabilityChange?: (block: TimeBlock, status: AvailabilityStatus) => Promise<void>;
  isMobile?: boolean;
  canEdit?: boolean;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function CalendarDayDetail({
  date,
  jobs,
  availability,
  googleCalendarEvents = [],
  onClose,
  onAvailabilityChange,
  isMobile = false,
  canEdit = true,
}: CalendarDayDetailProps) {
  const blocks = availability || getDefaultBlocks();
  const [updatingBlock, setUpdatingBlock] = useState<TimeBlock | null>(null);

  // Filter out KeyHub-synced events (they're just availability mirrors)
  const externalGCalEvents = googleCalendarEvents.filter(e => !e.isKeyHubEvent);

  // Cycle through availability statuses
  const handleBlockClick = async (block: TimeBlock) => {
    if (!canEdit || !onAvailabilityChange) return;

    const currentStatus = blocks[block];
    const statusOrder: AvailabilityStatus[] = ['available', 'busy', 'unavailable', 'on_leave'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    setUpdatingBlock(block);
    try {
      await onAvailabilityChange(block, nextStatus);
    } finally {
      setUpdatingBlock(null);
    }
  };

  const content = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-brand-gold" />
          <h3 className="text-lg font-semibold text-white">{formatDate(date)}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Availability Blocks */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">
            Availability {canEdit && onAvailabilityChange && <span className="text-xs text-gray-500">(tap to change)</span>}
          </span>
          <Link href="/portal/availability">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              <Settings className="w-3 h-3" />
              Manage
            </Button>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {TIME_BLOCKS.map((block) => {
            const status = blocks[block];
            const info = getAvailabilityInfo(status);
            const isUpdating = updatingBlock === block;
            const isClickable = canEdit && onAvailabilityChange && !isUpdating;

            return (
              <button
                key={block}
                onClick={() => handleBlockClick(block)}
                disabled={!isClickable}
                className={`p-2 rounded-lg ${info.bgColor} border border-gray-700 text-left transition-all ${
                  isClickable
                    ? 'cursor-pointer hover:border-brand-gold/50 hover:ring-1 hover:ring-brand-gold/30 active:scale-95'
                    : 'cursor-default'
                } ${isUpdating ? 'opacity-50' : ''}`}
              >
                <div className="text-xs font-medium text-gray-400 mb-1">
                  {TIME_BLOCK_CONFIG[block].label}
                </div>
                <div className={`text-sm font-medium ${info.color} flex items-center gap-1`}>
                  {isUpdating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    info.label
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Jobs Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">
            Scheduled Jobs ({jobs.length})
          </span>
        </div>

        {jobs.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No jobs scheduled</p>
          </div>
        ) : (
          <div className="space-y-2">
            {jobs.map((job) => (
              <CalendarJobCard key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Google Calendar Events Section */}
      {externalGCalEvents.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z" />
              </svg>
              Google Calendar ({externalGCalEvents.length})
            </span>
          </div>

          <div className="space-y-2">
            {externalGCalEvents.map((event) => (
              <GoogleCalendarEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    // Bottom sheet style for mobile
    return (
      <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
        <div className="bg-brand-charcoal border-t border-gray-800 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto safe-area-bottom">
          {/* Drag indicator */}
          <div className="w-12 h-1 bg-gray-700 rounded-full mx-auto mb-4" />
          {content}
        </div>
      </div>
    );
  }

  // Side panel for desktop
  return (
    <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-4 h-fit">
      {content}
    </div>
  );
}

// Google Calendar Event Card Component
function GoogleCalendarEventCard({ event }: { event: GoogleCalendarEvent }) {
  const formatTime = (dateStr: string, isAllDay: boolean) => {
    if (isAllDay) return 'All day';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm truncate">{event.summary}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(event.start, event.isAllDay)}
              {!event.isAllDay && ` - ${formatTime(event.end, event.isAllDay)}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
        {event.htmlLink && (
          <a
            href={event.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
            title="Open in Google Calendar"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

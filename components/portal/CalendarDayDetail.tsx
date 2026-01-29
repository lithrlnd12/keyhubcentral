'use client';

import { X, Calendar, Settings } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Job } from '@/types/job';
import {
  BlockStatus,
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
  onClose: () => void;
  isMobile?: boolean;
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
  onClose,
  isMobile = false,
}: CalendarDayDetailProps) {
  const blocks = availability || getDefaultBlocks();

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
          <span className="text-sm text-gray-400">Availability</span>
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
            return (
              <div
                key={block}
                className={`p-2 rounded-lg ${info.bgColor} border border-gray-700`}
              >
                <div className="text-xs font-medium text-gray-400 mb-1">
                  {TIME_BLOCK_CONFIG[block].label}
                </div>
                <div className={`text-sm font-medium ${info.color}`}>
                  {info.label}
                </div>
              </div>
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

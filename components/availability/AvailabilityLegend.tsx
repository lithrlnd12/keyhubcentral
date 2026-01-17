'use client';

import {
  getAvailabilityInfo,
  AvailabilityStatus,
  TIME_BLOCKS,
  TIME_BLOCK_CONFIG,
} from '@/types/availability';

const STATUSES: AvailabilityStatus[] = ['available', 'busy', 'unavailable', 'on_leave'];

export function AvailabilityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-6 px-4 py-2 bg-gray-800/50 rounded-lg">
      {/* Status Legend */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm text-gray-400 font-medium">Status:</span>
        {STATUSES.map((status) => {
          const info = getAvailabilityInfo(status);
          return (
            <div key={status} className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${info.bgColor}`} />
              <span className={`text-sm ${info.color}`}>{info.label}</span>
            </div>
          );
        })}
      </div>

      {/* Time Block Legend */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-400 font-medium">Time Blocks:</span>
        <div className="flex items-center gap-1">
          {TIME_BLOCKS.map((block, index) => (
            <div key={block} className="flex items-center gap-1">
              <div className="w-4 h-1.5 rounded-sm bg-gray-600" />
              <span className="text-xs text-gray-500">
                {TIME_BLOCK_CONFIG[block].shortLabel}
              </span>
              {index < TIME_BLOCKS.length - 1 && <span className="text-gray-600 mx-1">|</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Google Calendar Sync Legend */}
      <div className="flex items-center gap-2">
        <svg
          className="h-4 w-4 text-brand-gold"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
        </svg>
        <span className="text-sm text-gray-400">Synced from Google Calendar</span>
      </div>
    </div>
  );
}

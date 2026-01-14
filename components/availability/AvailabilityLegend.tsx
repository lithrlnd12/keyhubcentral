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
    </div>
  );
}

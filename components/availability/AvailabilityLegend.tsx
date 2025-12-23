'use client';

import { getAvailabilityInfo, AvailabilityStatus } from '@/types/availability';

const STATUSES: AvailabilityStatus[] = ['available', 'busy', 'unavailable', 'on_leave'];

export function AvailabilityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 bg-gray-800/50 rounded-lg">
      <span className="text-sm text-gray-400 font-medium">Legend:</span>
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
  );
}

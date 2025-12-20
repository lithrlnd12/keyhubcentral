'use client';

import { AvailabilityStatus, getAvailabilityInfo } from '@/types/availability';

interface DayCellProps {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  status?: AvailabilityStatus;
  onClick: (date: Date) => void;
}

export function DayCell({
  date,
  isCurrentMonth,
  isToday,
  isSelected,
  status,
  onClick,
}: DayCellProps) {
  const statusInfo = status ? getAvailabilityInfo(status) : null;

  return (
    <button
      type="button"
      onClick={() => onClick(date)}
      className={`
        relative w-full aspect-square p-1 rounded-lg transition-all
        ${isCurrentMonth ? 'text-white' : 'text-gray-600'}
        ${isToday ? 'ring-2 ring-brand-gold' : ''}
        ${isSelected ? 'bg-brand-gold/30' : 'hover:bg-gray-800'}
        ${statusInfo ? statusInfo.bgColor : ''}
      `}
    >
      <span
        className={`
          text-sm font-medium
          ${isToday ? 'text-brand-gold' : ''}
          ${statusInfo ? statusInfo.color : ''}
        `}
      >
        {date.getDate()}
      </span>

      {/* Status indicator dot */}
      {status && (
        <div
          className={`
            absolute bottom-1 left-1/2 -translate-x-1/2
            w-1.5 h-1.5 rounded-full
            ${status === 'available' ? 'bg-green-400' : ''}
            ${status === 'busy' ? 'bg-yellow-400' : ''}
            ${status === 'unavailable' ? 'bg-red-400' : ''}
            ${status === 'on_leave' ? 'bg-blue-400' : ''}
          `}
        />
      )}
    </button>
  );
}

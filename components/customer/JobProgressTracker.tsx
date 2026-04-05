'use client';

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JobStatus, JOB_STATUS_ORDER, JobDates } from '@/types/job';
import { Timestamp } from 'firebase/firestore';

interface JobProgressTrackerProps {
  currentStatus: JobStatus;
  dates?: JobDates;
  className?: string;
}

const STATUS_LABELS: Record<JobStatus, string> = {
  lead: 'Lead',
  sold: 'Sold',
  front_end_hold: 'Front End Hold',
  production: 'Production',
  scheduled: 'Scheduled',
  started: 'Started',
  complete: 'Complete',
  paid_in_full: 'Paid in Full',
};

// Map job statuses to their corresponding date fields
function getDateForStatus(
  status: JobStatus,
  dates?: JobDates
): Date | null {
  if (!dates) return null;

  const dateMap: Partial<Record<JobStatus, Timestamp | null>> = {
    lead: dates.created,
    sold: dates.sold,
    scheduled: dates.scheduledStart,
    started: dates.actualStart,
    complete: dates.actualCompletion,
    paid_in_full: dates.paidInFull,
  };

  const ts = dateMap[status];
  if (!ts) return null;

  return ts.toDate ? ts.toDate() : null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function JobProgressTracker({
  currentStatus,
  dates,
  className,
}: JobProgressTrackerProps) {
  const [mounted, setMounted] = useState(false);
  const currentIndex = JOB_STATUS_ORDER.indexOf(currentStatus);

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop: Horizontal layout */}
      <div className="hidden md:block">
        <div className="flex items-start justify-between relative">
          {/* Progress line background */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200" />
          {/* Progress line filled */}
          <div
            className={cn(
              'absolute top-5 left-0 h-0.5 bg-blue-600 transition-all duration-1000 ease-out',
              !mounted && 'w-0'
            )}
            style={
              mounted
                ? {
                    width: `${(currentIndex / (JOB_STATUS_ORDER.length - 1)) * 100}%`,
                  }
                : undefined
            }
          />

          {JOB_STATUS_ORDER.map((status, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;
            const date = getDateForStatus(status, dates);

            return (
              <div
                key={status}
                className="flex flex-col items-center relative z-10"
                style={{ width: `${100 / JOB_STATUS_ORDER.length}%` }}
              >
                {/* Circle indicator */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500',
                    isComplete &&
                      'bg-blue-600 border-blue-600 text-white',
                    isCurrent &&
                      'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-100',
                    isFuture && 'bg-white border-gray-300 text-gray-400',
                    mounted ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
                  )}
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={cn(
                    'text-xs font-medium mt-2 text-center leading-tight',
                    isComplete && 'text-blue-600',
                    isCurrent && 'text-blue-700 font-semibold',
                    isFuture && 'text-gray-400'
                  )}
                >
                  {STATUS_LABELS[status]}
                </span>

                {/* Date (if available for completed/current stages) */}
                {date && (isComplete || isCurrent) && (
                  <span className="text-[10px] text-gray-500 mt-0.5">
                    {formatDate(date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile: Vertical layout */}
      <div className="md:hidden">
        <div className="relative pl-8">
          {/* Vertical line background */}
          <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200" />
          {/* Vertical line filled */}
          <div
            className={cn(
              'absolute left-[15px] top-0 w-0.5 bg-blue-600 transition-all duration-1000 ease-out',
              !mounted && 'h-0'
            )}
            style={
              mounted
                ? {
                    height: `${(currentIndex / (JOB_STATUS_ORDER.length - 1)) * 100}%`,
                  }
                : undefined
            }
          />

          {JOB_STATUS_ORDER.map((status, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;
            const date = getDateForStatus(status, dates);

            return (
              <div
                key={status}
                className={cn(
                  'relative flex items-start gap-4 pb-6 last:pb-0',
                  mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                )}
                style={{
                  transition: 'opacity 0.4s ease, transform 0.4s ease',
                  transitionDelay: `${index * 80}ms`,
                }}
              >
                {/* Circle indicator */}
                <div
                  className={cn(
                    'absolute -left-8 w-8 h-8 rounded-full flex items-center justify-center border-2 flex-shrink-0 z-10 transition-colors duration-500',
                    isComplete && 'bg-blue-600 border-blue-600 text-white',
                    isCurrent &&
                      'bg-white border-blue-600 text-blue-600 ring-4 ring-blue-100',
                    isFuture && 'bg-white border-gray-300 text-gray-400'
                  )}
                >
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </div>

                {/* Label and date */}
                <div className="pt-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isComplete && 'text-blue-600',
                      isCurrent && 'text-blue-700 font-semibold',
                      isFuture && 'text-gray-400'
                    )}
                  >
                    {STATUS_LABELS[status]}
                  </p>
                  {date && (isComplete || isCurrent) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(date)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

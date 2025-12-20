'use client';

import { Job, JOB_STATUS_ORDER, JobStatus } from '@/types/job';
import { JobCard } from './JobCard';
import { JobStatusBadge } from './JobStatusBadge';
import { groupJobsByStatus, JOB_STATUS_LABELS } from '@/lib/utils/jobs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils/cn';

interface JobPipelineProps {
  jobs: Job[];
  onJobClick?: (job: Job) => void;
  className?: string;
}

export function JobPipeline({ jobs, onJobClick, className }: JobPipelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const groupedJobs = groupJobsByStatus(jobs);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const scrollAmount = 300;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className={cn('relative', className)}>
      {/* Scroll buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-white hover:bg-gray-700 shadow-lg"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-gray-800 border border-gray-700 rounded-full flex items-center justify-center text-white hover:bg-gray-700 shadow-lg"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Pipeline columns */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {JOB_STATUS_ORDER.map((status) => {
          const statusJobs = groupedJobs[status];
          const count = statusJobs.length;

          return (
            <div
              key={status}
              className="flex-shrink-0 w-72 bg-gray-800/30 rounded-xl border border-gray-700"
            >
              {/* Column header */}
              <div className="p-3 border-b border-gray-700 flex items-center justify-between">
                <JobStatusBadge status={status} size="sm" />
                <span className="text-sm text-gray-400 font-medium">
                  {count}
                </span>
              </div>

              {/* Column content */}
              <div className="p-3 space-y-3 max-h-[calc(100vh-300px)] overflow-y-auto">
                {statusJobs.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No jobs
                  </p>
                ) : (
                  statusJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      showDetails={false}
                      className="bg-brand-charcoal"
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

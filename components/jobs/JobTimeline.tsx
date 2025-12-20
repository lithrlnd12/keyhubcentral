'use client';

import { Job, JOB_STATUS_ORDER, JobStatus } from '@/types/job';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  JOB_STATUS_LABELS,
  JOB_STATUS_COLORS,
  formatJobDate,
} from '@/lib/utils/jobs';
import { Check, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface JobTimelineProps {
  job: Job;
  canEdit: boolean;
  onUpdate: (data: Partial<Job>) => Promise<void>;
}

const STATUS_DATE_MAPPING: Record<JobStatus, keyof Job['dates'] | null> = {
  lead: 'created',
  sold: 'sold',
  front_end_hold: null,
  production: null,
  scheduled: 'scheduledStart',
  started: 'actualStart',
  complete: 'actualCompletion',
  paid_in_full: 'paidInFull',
};

export function JobTimeline({ job, canEdit, onUpdate }: JobTimelineProps) {
  const currentIndex = JOB_STATUS_ORDER.indexOf(job.status);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-gold" />
          Status Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-700" />

          {/* Timeline items */}
          <div className="space-y-6">
            {JOB_STATUS_ORDER.map((status, index) => {
              const isComplete = index < currentIndex;
              const isCurrent = index === currentIndex;
              const colors = JOB_STATUS_COLORS[status];
              const dateKey = STATUS_DATE_MAPPING[status];
              const date = dateKey ? job.dates[dateKey] : null;

              return (
                <div key={status} className="relative flex items-start gap-4 pl-10">
                  {/* Status indicator */}
                  <div
                    className={cn(
                      'absolute left-0 w-8 h-8 rounded-full flex items-center justify-center border-2',
                      isComplete && 'bg-green-500/20 border-green-500',
                      isCurrent && `${colors.bg} ${colors.border}`,
                      !isComplete && !isCurrent && 'bg-gray-800 border-gray-600'
                    )}
                  >
                    {isComplete ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : isCurrent ? (
                      <Circle className={cn('w-3 h-3', colors.text)} />
                    ) : (
                      <Circle className="w-3 h-3 text-gray-600" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'font-medium',
                          isComplete && 'text-green-400',
                          isCurrent && colors.text,
                          !isComplete && !isCurrent && 'text-gray-500'
                        )}
                      >
                        {JOB_STATUS_LABELS[status]}
                      </span>
                      {isCurrent && (
                        <span className={cn(
                          'text-xs px-2 py-0.5 rounded-full',
                          colors.bg,
                          colors.text
                        )}>
                          Current
                        </span>
                      )}
                    </div>
                    {date && (
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatJobDate(date)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { Job } from '@/types/job';
import { Card, CardContent } from '@/components/ui/Card';
import { JobStatusBadge } from './JobStatusBadge';
import {
  formatJobType,
  formatJobDate,
  isJobOverdue,
  getDaysUntilCompletion,
  JOB_TYPE_ICONS,
} from '@/lib/utils/jobs';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  User,
  MapPin,
  Phone,
  Calendar,
  DollarSign,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface JobCardProps {
  job: Job;
  showDetails?: boolean;
  className?: string;
}

export function JobCard({ job, showDetails = true, className }: JobCardProps) {
  const overdue = isJobOverdue(job);
  const daysUntil = getDaysUntilCompletion(job);
  const totalCost = job.costs.materialActual + job.costs.laborActual;
  const totalProjected = job.costs.materialProjected + job.costs.laborProjected;

  return (
    <Link href={`/kr/${job.id}`}>
      <Card
        className={cn(
          'hover:border-brand-gold/50 transition-colors cursor-pointer',
          overdue && 'border-red-500/30',
          className
        )}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-lg">{JOB_TYPE_ICONS[job.type]}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">{job.jobNumber}</span>
                  {overdue && (
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  )}
                </div>
                <span className="text-gray-400 text-sm">{formatJobType(job.type)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <JobStatusBadge status={job.status} size="sm" />
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </div>
          </div>

          {/* Customer Info */}
          <div className="space-y-1.5 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-white truncate">{job.customer.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-gray-400 truncate">
                {job.customer.address.city}, {job.customer.address.state}
              </span>
            </div>
            {showDetails && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-gray-400">{job.customer.phone}</span>
              </div>
            )}
          </div>

          {/* Details */}
          {showDetails && (
            <div className="flex items-center gap-4 pt-3 border-t border-gray-700/50">
              {/* Target Date */}
              <div className="flex items-center gap-1.5 text-sm">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className={cn(
                  'text-gray-400',
                  overdue && 'text-red-400',
                  daysUntil !== null && daysUntil > 0 && daysUntil <= 7 && 'text-yellow-400'
                )}>
                  {job.dates.targetCompletion
                    ? formatJobDate(job.dates.targetCompletion)
                    : 'No target'}
                </span>
              </div>

              {/* Cost */}
              <div className="flex items-center gap-1.5 text-sm">
                <DollarSign className="w-4 h-4 text-gray-500" />
                <span className={cn(
                  'text-gray-400',
                  totalCost > totalProjected && 'text-red-400',
                  totalCost < totalProjected && 'text-green-400'
                )}>
                  {formatCurrency(totalCost || totalProjected)}
                </span>
              </div>

              {/* Crew Count */}
              {job.crewIds.length > 0 && (
                <div className="flex items-center gap-1.5 text-sm ml-auto">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-400">{job.crewIds.length} crew</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

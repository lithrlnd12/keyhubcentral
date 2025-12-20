'use client';

import { Job } from '@/types/job';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  formatJobType,
  formatJobDate,
  getWarrantyInfo,
  getJobProgress,
} from '@/lib/utils/jobs';
import { formatCurrency } from '@/lib/utils/formatters';
import { Briefcase, Shield, Clock, DollarSign } from 'lucide-react';

interface JobInfoProps {
  job: Job;
}

export function JobInfo({ job }: JobInfoProps) {
  const progress = getJobProgress(job.status);
  const warranty = getWarrantyInfo(job);
  const totalProjected = job.costs.materialProjected + job.costs.laborProjected;

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Job Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-brand-gold" />
            Job Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Job Number</p>
              <p className="text-white font-medium">{job.jobNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="text-white font-medium">{formatJobType(job.type)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Created</p>
              <p className="text-white">{formatJobDate(job.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Last Updated</p>
              <p className="text-white">{formatJobDate(job.updatedAt)}</p>
            </div>
          </div>

          {job.notes && (
            <div>
              <p className="text-sm text-gray-500 mb-1">Notes</p>
              <p className="text-white whitespace-pre-wrap">{job.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-brand-gold" />
            Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Overall Progress</span>
              <span className="text-white font-medium">{progress}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-brand-gold transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-sm text-gray-500">Sold Date</p>
              <p className="text-white">{formatJobDate(job.dates.sold)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Scheduled Start</p>
              <p className="text-white">{formatJobDate(job.dates.scheduledStart)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Target Completion</p>
              <p className="text-white">{formatJobDate(job.dates.targetCompletion)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Actual Completion</p>
              <p className="text-white">{formatJobDate(job.dates.actualCompletion)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-gold" />
            Cost Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Projected Total</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(totalProjected)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Actual Total</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(job.costs.materialActual + job.costs.laborActual)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Warranty */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-gold" />
            Warranty
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Status</span>
            <span className={`font-medium ${warranty.color}`}>{warranty.status}</span>
          </div>
          {warranty.daysRemaining !== null && warranty.daysRemaining > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Days Remaining</span>
              <span className="text-white font-medium">{warranty.daysRemaining}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="text-white">{formatJobDate(job.warranty.startDate)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="text-white">{formatJobDate(job.warranty.endDate)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { MapPin, Navigation, Bath, ChefHat, Home, Wrench } from 'lucide-react';
import Link from 'next/link';
import { Job, JobType } from '@/types/job';
import { Badge } from '@/components/ui/Badge';

interface CalendarJobCardProps {
  job: Job;
  compact?: boolean;
}

function getJobTypeIcon(type: JobType) {
  switch (type) {
    case 'bathroom':
      return Bath;
    case 'kitchen':
      return ChefHat;
    case 'exterior':
      return Home;
    default:
      return Wrench;
  }
}

function getStatusBadge(status: Job['status']) {
  switch (status) {
    case 'scheduled':
      return <Badge variant="info" className="text-xs">Scheduled</Badge>;
    case 'started':
      return <Badge variant="warning" className="text-xs">In Progress</Badge>;
    case 'complete':
      return <Badge variant="success" className="text-xs">Complete</Badge>;
    default:
      return null;
  }
}

function formatAddress(job: Job): string {
  const addr = job.customer?.address;
  if (!addr) return 'No address';
  return `${addr.street}, ${addr.city}`;
}

function getNavigationUrl(job: Job): string | null {
  const addr = job.customer?.address;
  if (!addr) return null;
  const fullAddress = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}&travelmode=driving`;
}

export function CalendarJobCard({ job, compact = false }: CalendarJobCardProps) {
  const Icon = getJobTypeIcon(job.type);
  const navUrl = getNavigationUrl(job);

  if (compact) {
    return (
      <Link
        href={`/portal/jobs/${job.id}`}
        className="flex items-center gap-2 p-2 rounded-lg bg-brand-gold/10 border border-brand-gold/20 hover:border-brand-gold/40 transition-colors"
      >
        <Icon className="w-4 h-4 text-brand-gold flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">
            {job.customer?.name || 'Unknown'}
          </p>
          <p className="text-xs text-gray-400 truncate">{job.jobNumber}</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-gold/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-brand-gold" />
          </div>
          <div>
            <Link
              href={`/portal/jobs/${job.id}`}
              className="text-sm font-medium text-white hover:text-brand-gold transition-colors"
            >
              {job.jobNumber}
            </Link>
            {getStatusBadge(job.status)}
          </div>
        </div>
      </div>

      <p className="text-sm text-white mb-2">{job.customer?.name || 'Unknown Customer'}</p>

      <div className="flex items-center gap-2 text-xs text-gray-400">
        <MapPin className="w-3 h-3 flex-shrink-0" />
        <span className="truncate flex-1">{formatAddress(job)}</span>
        {navUrl && (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20 rounded transition-colors flex-shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <Navigation className="w-3 h-3" />
            Go
          </a>
        )}
      </div>

      {job.type && (
        <p className="text-xs text-gray-500 mt-2 capitalize">
          {job.type.replace(/_/g, ' ')} job
        </p>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { MapPin, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Contractor, Trade } from '@/types/contractor';
import { RatingDisplay } from './RatingDisplay';
import { StatusBadge } from './StatusBadge';

interface ContractorCardProps {
  contractor: Contractor;
  className?: string;
}

const tradeLabels: Record<Trade, string> = {
  installer: 'Installer',
  sales_rep: 'Sales Rep',
  service_tech: 'Service Tech',
  pm: 'Project Manager',
};

export function ContractorCard({ contractor, className }: ContractorCardProps) {
  const displayName = contractor.businessName || `Contractor ${contractor.id.slice(0, 6)}`;

  return (
    <Link
      href={`/kts/${contractor.id}`}
      className={cn(
        'block bg-brand-charcoal rounded-xl p-4 border border-gray-800',
        'hover:border-brand-gold/50 transition-colors',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-medium truncate">{displayName}</h3>
            <StatusBadge status={contractor.status} />
          </div>

          <div className="flex items-center gap-1 mt-1 text-sm text-gray-400">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {contractor.address.city}, {contractor.address.state}
            </span>
          </div>

          <div className="flex items-center gap-1 mt-1 text-sm text-gray-400">
            <Wrench className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {contractor.trades.map((t) => tradeLabels[t]).join(', ')}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0">
          <RatingDisplay rating={contractor.rating.overall} size="sm" />
        </div>
      </div>

      {contractor.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {contractor.skills.slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-400"
            >
              {skill}
            </span>
          ))}
          {contractor.skills.length > 3 && (
            <span className="px-2 py-0.5 text-xs text-gray-500">
              +{contractor.skills.length - 3} more
            </span>
          )}
        </div>
      )}
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { ArrowLeft, Edit, MapPin } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Contractor } from '@/types/contractor';
import { StatusBadge } from './StatusBadge';
import { RatingDisplay } from './RatingDisplay';
import { formatAddressShort, formatTrades } from '@/lib/utils/contractors';

interface ContractorHeaderProps {
  contractor: Contractor;
  canEdit?: boolean;
}

export function ContractorHeader({ contractor, canEdit = false }: ContractorHeaderProps) {
  const displayName = contractor.businessName || `Contractor ${contractor.id.slice(0, 6)}`;

  return (
    <div className="space-y-4">
      <Link
        href="/kts"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Contractors</span>
      </Link>

      <div className="bg-brand-charcoal rounded-xl p-6 border border-gray-800">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <Avatar name={displayName} size="xl" />

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">{displayName}</h1>
              <StatusBadge status={contractor.status} />
            </div>

            <div className="flex items-center gap-1 mt-1 text-gray-400">
              <MapPin className="w-4 h-4 flex-shrink-0" />
              <span>{formatAddressShort(contractor.address)}</span>
            </div>

            <p className="text-gray-400 mt-1">{formatTrades(contractor.trades)}</p>

            <div className="mt-3">
              <RatingDisplay
                rating={contractor.rating.overall}
                showTier
                size="md"
              />
            </div>
          </div>

          {canEdit && (
            <div className="flex-shrink-0">
              <Link href={`/kts/${contractor.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

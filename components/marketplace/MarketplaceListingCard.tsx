'use client';

import { MapPin, Clock, Users, DollarSign, Calendar, Gavel } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  MarketplaceListing,
  TIME_BLOCK_LABELS,
  PAY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
  LISTING_STATUS_VARIANTS,
} from '@/types/marketplace';
import { formatCurrency } from '@/lib/utils/formatters';

interface MarketplaceListingCardProps {
  listing: MarketplaceListing;
  mode: 'contractor' | 'dealer';
  onPlaceBid?: (listing: MarketplaceListing) => void;
  onViewBids?: (listing: MarketplaceListing) => void;
}

export function MarketplaceListingCard({
  listing,
  mode,
  onPlaceBid,
  onViewBids,
}: MarketplaceListingCardProps) {
  const pendingBids = listing.bids.filter((b) => b.status === 'pending').length;

  return (
    <Card className="p-4 flex flex-col gap-3 hover:border-gray-700 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-semibold truncate">{listing.title}</h3>
          <p className="text-sm text-gray-400 mt-0.5">{listing.jobType}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant={LISTING_STATUS_VARIANTS[listing.status]}>
            {LISTING_STATUS_LABELS[listing.status]}
          </Badge>
          <Badge variant="info">{listing.trade}</Badge>
        </div>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <MapPin className="w-4 h-4 flex-shrink-0" />
        <span>{listing.location.city}, {listing.location.state}</span>
      </div>

      {/* Date & Time */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-4 h-4" />
          <span>{new Date(listing.dateNeeded).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="w-4 h-4" />
          <span>{TIME_BLOCK_LABELS[listing.timeBlock]}</span>
        </div>
        <span className="text-gray-500">{listing.estimatedDuration}</span>
      </div>

      {/* Pay Rate */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-green-400" />
        <span className="text-green-400 font-semibold">
          {formatCurrency(listing.payRate)}{PAY_TYPE_LABELS[listing.payType]}
        </span>
      </div>

      {/* Required Skills */}
      {listing.requiredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {listing.requiredSkills.map((skill) => (
            <span
              key={skill}
              className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-md"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      {/* Crew Size & Bids */}
      <div className="flex items-center gap-4 text-sm text-gray-400">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4" />
          <span>{listing.crewSize} crew needed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Gavel className="w-4 h-4" />
          <span>{listing.bids.length} bid{listing.bids.length !== 1 ? 's' : ''}</span>
          {pendingBids > 0 && (
            <Badge variant="warning">{pendingBids} pending</Badge>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-1">
        {mode === 'contractor' && listing.status === 'open' && onPlaceBid && (
          <Button size="sm" onClick={() => onPlaceBid(listing)}>
            Place Bid
          </Button>
        )}
        {mode === 'dealer' && onViewBids && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onViewBids(listing)}
          >
            View Bids ({listing.bids.length})
          </Button>
        )}
      </div>
    </Card>
  );
}

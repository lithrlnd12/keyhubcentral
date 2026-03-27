'use client';

import { useEffect, useState } from 'react';
import { Plus, Star, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { MarketplaceListingCard } from './MarketplaceListingCard';
import { subscribeToMyListings, acceptBid, rejectBid } from '@/lib/firebase/marketplace';
import {
  MarketplaceListing,
  MarketplaceBid,
  MarketplaceListingStatus,
  PAY_TYPE_LABELS,
  LISTING_STATUS_LABELS,
} from '@/types/marketplace';
import { formatCurrency } from '@/lib/utils/formatters';
import { useToast } from '@/components/ui/Toast';

interface MarketplaceDashboardProps {
  dealerId: string;
  onCreateListing: () => void;
}

export function MarketplaceDashboard({ dealerId, onCreateListing }: MarketplaceDashboardProps) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedListingId, setExpandedListingId] = useState<string | null>(null);
  const [processingBid, setProcessingBid] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    const unsubscribe = subscribeToMyListings(dealerId, (data) => {
      setListings(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [dealerId]);

  const filterByStatus = (status: MarketplaceListingStatus) =>
    listings.filter((l) => l.status === status);

  const toggleExpand = (listingId: string) => {
    setExpandedListingId((prev) => (prev === listingId ? null : listingId));
  };

  const handleAcceptBid = async (listingId: string, bidId: string) => {
    setProcessingBid(bidId);
    try {
      await acceptBid(listingId, bidId);
      showToast('Bid accepted successfully', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to accept bid', 'error');
    } finally {
      setProcessingBid(null);
    }
  };

  const handleRejectBid = async (listingId: string, bidId: string) => {
    setProcessingBid(bidId);
    try {
      await rejectBid(listingId, bidId);
      showToast('Bid rejected', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to reject bid', 'error');
    } finally {
      setProcessingBid(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const statusTabs: { value: MarketplaceListingStatus; label: string; count: number }[] = [
    { value: 'open', label: 'Open', count: filterByStatus('open').length },
    { value: 'claimed', label: 'Claimed', count: filterByStatus('claimed').length },
    { value: 'filled', label: 'Filled', count: filterByStatus('filled').length },
    { value: 'cancelled', label: 'Cancelled', count: filterByStatus('cancelled').length },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">My Listings</h3>
        <Button size="sm" onClick={onCreateListing}>
          <Plus className="w-4 h-4 mr-2" />
          Create Listing
        </Button>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          {statusTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label} ({tab.count})
            </TabsTrigger>
          ))}
        </TabsList>

        {statusTabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            {filterByStatus(tab.value).length === 0 ? (
              <EmptyState
                title={`No ${tab.label.toLowerCase()} listings`}
                description={
                  tab.value === 'open'
                    ? 'Create a listing to start receiving bids from contractors.'
                    : `You have no ${tab.label.toLowerCase()} listings.`
                }
                action={
                  tab.value === 'open' ? (
                    <Button size="sm" onClick={onCreateListing}>
                      Create Listing
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <div className="space-y-4">
                {filterByStatus(tab.value).map((listing) => (
                  <div key={listing.id}>
                    {/* Listing summary with expand toggle */}
                    <Card className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-medium truncate">{listing.title}</h4>
                          <p className="text-sm text-gray-400">
                            {listing.location.city}, {listing.location.state} &mdash;{' '}
                            {formatCurrency(listing.payRate)}{PAY_TYPE_LABELS[listing.payType]}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={listing.bids.length > 0 ? 'info' : 'default'}>
                            {listing.bids.length} bid{listing.bids.length !== 1 ? 's' : ''}
                          </Badge>
                          <button
                            onClick={() => toggleExpand(listing.id)}
                            className="text-gray-400 hover:text-white transition-colors"
                          >
                            {expandedListingId === listing.id ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded bids section */}
                      {expandedListingId === listing.id && (
                        <div className="mt-4 pt-4 border-t border-gray-800 space-y-3">
                          {listing.bids.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-4">
                              No bids yet
                            </p>
                          ) : (
                            listing.bids.map((bid) => (
                              <BidCard
                                key={bid.id}
                                bid={bid}
                                listing={listing}
                                processing={processingBid === bid.id}
                                onAccept={() => handleAcceptBid(listing.id, bid.id)}
                                onReject={() => handleRejectBid(listing.id, bid.id)}
                              />
                            ))
                          )}
                        </div>
                      )}
                    </Card>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

// --- BidCard sub-component ---

interface BidCardProps {
  bid: MarketplaceBid;
  listing: MarketplaceListing;
  processing: boolean;
  onAccept: () => void;
  onReject: () => void;
}

function BidCard({ bid, listing, processing, onAccept, onReject }: BidCardProps) {
  const statusVariant: Record<MarketplaceBid['status'], 'default' | 'success' | 'error' | 'warning'> = {
    pending: 'warning',
    accepted: 'success',
    rejected: 'error',
    withdrawn: 'default',
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white font-medium">{bid.contractorName}</p>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              {bid.contractorRating.toFixed(1)}
            </span>
            <Badge variant="default">{bid.contractorTier}</Badge>
            {bid.distance > 0 && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {bid.distance.toFixed(1)} mi
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-green-400 font-semibold">
            {formatCurrency(bid.proposedRate)}{PAY_TYPE_LABELS[listing.payType]}
          </p>
          <Badge variant={statusVariant[bid.status]}>
            {bid.status}
          </Badge>
        </div>
      </div>

      {bid.message && (
        <p className="text-sm text-gray-300 bg-gray-800 rounded p-2">
          {bid.message}
        </p>
      )}

      {bid.status === 'pending' && listing.status === 'open' && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={onAccept}
            loading={processing}
            disabled={processing}
          >
            Accept
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={onReject}
            loading={processing}
            disabled={processing}
          >
            Reject
          </Button>
        </div>
      )}
    </div>
  );
}

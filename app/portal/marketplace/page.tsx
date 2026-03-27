'use client';

import { useEffect, useState, useCallback } from 'react';
import { Store, X } from 'lucide-react';
import { BackButton } from '@/components/ui/BackButton';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MarketplaceFeed } from '@/components/marketplace/MarketplaceFeed';
import { BidForm } from '@/components/marketplace/BidForm';
import { useAuth } from '@/lib/hooks/useAuth';
import { findAndLinkContractor } from '@/lib/firebase/contractors';
import { getOpenListings } from '@/lib/firebase/marketplace';
import { Contractor, getRatingTier } from '@/types/contractor';
import { MarketplaceListing, MarketplaceBid, PAY_TYPE_LABELS } from '@/types/marketplace';
import { calculateDistanceMiles } from '@/lib/utils/distance';
import { formatCurrency } from '@/lib/utils/formatters';
import { useToast } from '@/components/ui/Toast';

export default function PortalMarketplacePage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  // Bid modal state
  const [bidListing, setBidListing] = useState<MarketplaceListing | null>(null);

  // My bids tracking
  const [myBids, setMyBids] = useState<Array<{ listing: MarketplaceListing; bid: MarketplaceBid }>>([]);
  const [bidsLoading, setBidsLoading] = useState(true);

  // Load contractor
  useEffect(() => {
    async function load() {
      if (user?.uid && user?.email) {
        try {
          const data = await findAndLinkContractor(user.uid, user.email);
          setContractor(data);
        } catch (error) {
          console.error('Error loading contractor:', error);
        } finally {
          setLoading(false);
        }
      } else if (user?.uid) {
        setLoading(false);
      }
    }
    load();
  }, [user?.uid, user?.email]);

  // Load my bids
  const loadMyBids = useCallback(async () => {
    if (!user?.uid) return;
    setBidsLoading(true);
    try {
      // Get all open listings (and filter for ones contractor bid on)
      const allListings = await getOpenListings();
      const bids: Array<{ listing: MarketplaceListing; bid: MarketplaceBid }> = [];
      for (const listing of allListings) {
        const myBid = listing.bids.find((b) => b.contractorId === user.uid);
        if (myBid) {
          bids.push({ listing, bid: myBid });
        }
      }
      setMyBids(bids);
    } catch (error) {
      console.error('Error loading bids:', error);
    } finally {
      setBidsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadMyBids();
  }, [loadMyBids]);

  const getDistanceToListing = (listing: MarketplaceListing): number | null => {
    if (!contractor?.address?.lat || !contractor?.address?.lng) return null;
    if (!listing.location.lat || !listing.location.lng) return null;
    return calculateDistanceMiles(
      contractor.address.lat,
      contractor.address.lng,
      listing.location.lat,
      listing.location.lng
    );
  };

  const handlePlaceBid = (listing: MarketplaceListing) => {
    setBidListing(listing);
  };

  const handleBidSubmitted = () => {
    setBidListing(null);
    showToast('Bid submitted successfully!', 'success');
    loadMyBids();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  const contractorLocation =
    contractor?.address?.lat && contractor?.address?.lng
      ? { lat: contractor.address.lat, lng: contractor.address.lng }
      : null;

  const tier = contractor?.rating?.overall ? getRatingTier(contractor.rating.overall) : 'standard';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton href="/portal" label="Back to Portal" />
          <div className="flex items-center gap-3 mt-3">
            <Store className="w-6 h-6 text-brand-gold" />
            <h2 className="text-xl font-bold text-white">Labor Marketplace</h2>
          </div>
          <p className="text-gray-400 mt-1">
            Find and bid on available work from dealers
          </p>
        </div>
      </div>

      {/* Bid Modal Overlay */}
      {bidListing && contractor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-end mb-2">
              <button
                onClick={() => setBidListing(null)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <BidForm
              listing={bidListing}
              contractorId={user?.uid || ''}
              contractorName={contractor.businessName || 'Contractor'}
              contractorRating={contractor.rating?.overall || 0}
              contractorTier={tier}
              distance={getDistanceToListing(bidListing)}
              onSubmit={handleBidSubmitted}
              onCancel={() => setBidListing(null)}
            />
          </div>
        </div>
      )}

      {/* My Bids Section */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">My Bids</h3>
        {bidsLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : myBids.length === 0 ? (
          <Card className="p-4">
            <p className="text-gray-400 text-sm text-center">
              You haven&apos;t placed any bids yet. Browse listings below to get started.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myBids.map(({ listing, bid }) => {
              const statusVariant: Record<string, 'warning' | 'success' | 'error' | 'default'> = {
                pending: 'warning',
                accepted: 'success',
                rejected: 'error',
                withdrawn: 'default',
              };
              return (
                <Card key={bid.id} className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{listing.title}</p>
                      <p className="text-sm text-gray-400">
                        {listing.location.city}, {listing.location.state}
                      </p>
                    </div>
                    <Badge variant={statusVariant[bid.status] || 'default'}>
                      {bid.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                    <span>
                      Your bid: <span className="text-green-400 font-medium">{formatCurrency(bid.proposedRate)}{PAY_TYPE_LABELS[listing.payType]}</span>
                    </span>
                    <span>
                      Listed: {formatCurrency(listing.payRate)}{PAY_TYPE_LABELS[listing.payType]}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Browse Listings */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Available Listings</h3>
        <MarketplaceFeed
          contractorTrades={contractor?.trades || []}
          contractorLocation={contractorLocation}
          onPlaceBid={handlePlaceBid}
          mode="contractor"
        />
      </div>
    </div>
  );
}

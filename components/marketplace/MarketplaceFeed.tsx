'use client';

import { useEffect, useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Slider } from '@/components/ui/Slider';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { MarketplaceListingCard } from './MarketplaceListingCard';
import { subscribeToOpenListings } from '@/lib/firebase/marketplace';
import {
  MarketplaceListing,
  MarketplaceFilters,
  TRADE_OPTIONS,
} from '@/types/marketplace';
import { calculateDistanceMiles } from '@/lib/utils/distance';

type SortOption = 'newest' | 'highest_pay' | 'closest' | 'soonest';

interface MarketplaceFeedProps {
  contractorTrades?: string[];
  contractorLocation?: { lat: number; lng: number } | null;
  onPlaceBid?: (listing: MarketplaceListing) => void;
  mode?: 'contractor' | 'dealer';
}

export function MarketplaceFeed({
  contractorTrades,
  contractorLocation,
  onPlaceBid,
  mode = 'contractor',
}: MarketplaceFeedProps) {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [tradeFilter, setTradeFilter] = useState('');
  const [distanceFilter, setDistanceFilter] = useState(100);
  const [minPay, setMinPay] = useState(0);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');

  // Subscribe to open listings
  useEffect(() => {
    const filters: MarketplaceFilters = {};
    if (tradeFilter) filters.trade = tradeFilter;
    if (search) filters.search = search;
    if (minPay > 0) filters.minPay = minPay;

    setLoading(true);
    const unsubscribe = subscribeToOpenListings((data) => {
      setListings(data);
      setLoading(false);
    }, filters);

    return () => unsubscribe();
  }, [tradeFilter, search, minPay]);

  // Compute distances and apply distance + trade filters client-side
  const filteredAndSorted = useMemo(() => {
    let result = [...listings];

    // Filter by contractor trades if provided
    if (contractorTrades && contractorTrades.length > 0) {
      result = result.filter((l) => contractorTrades.includes(l.trade));
    }

    // Calculate distance and filter
    if (contractorLocation) {
      result = result
        .map((l) => {
          if (l.location.lat && l.location.lng) {
            const dist = calculateDistanceMiles(
              contractorLocation.lat,
              contractorLocation.lng,
              l.location.lat,
              l.location.lng
            );
            return { ...l, _distance: dist };
          }
          return { ...l, _distance: null as number | null };
        })
        .filter((l) => l._distance === null || l._distance <= distanceFilter);
    }

    // Sort
    switch (sortBy) {
      case 'highest_pay':
        result.sort((a, b) => b.payRate - a.payRate);
        break;
      case 'soonest':
        result.sort((a, b) => a.dateNeeded.localeCompare(b.dateNeeded));
        break;
      case 'closest':
        if (contractorLocation) {
          result.sort((a, b) => {
            const distA = (a as unknown as Record<string, unknown>)._distance as number | null;
            const distB = (b as unknown as Record<string, unknown>)._distance as number | null;
            if (distA === null) return 1;
            if (distB === null) return -1;
            return distA - distB;
          });
        }
        break;
      case 'newest':
      default:
        // Already sorted by createdAt desc from Firestore
        break;
    }

    return result;
  }, [listings, contractorTrades, contractorLocation, distanceFilter, sortBy]);

  const tradeOptions = [
    { value: '', label: 'All Trades' },
    ...TRADE_OPTIONS.map((t) => ({ value: t.value, label: t.label })),
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'highest_pay', label: 'Highest Pay' },
    { value: 'closest', label: 'Closest' },
    { value: 'soonest', label: 'Soonest Needed' },
  ];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
          />
        </div>

        <Select
          options={tradeOptions}
          value={tradeFilter}
          onChange={(e) => setTradeFilter(e.target.value)}
          placeholder="All Trades"
        />

        <Select
          options={sortOptions}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
        />

        {contractorLocation && (
          <Slider
            label="Max Distance"
            value={distanceFilter}
            onChange={setDistanceFilter}
            min={10}
            max={100}
            step={10}
            formatValue={(v) => `${v} mi`}
          />
        )}
      </div>

      {/* Pay rate filter */}
      <div className="flex items-center gap-4">
        <Input
          type="number"
          placeholder="Min pay rate"
          value={minPay || ''}
          onChange={(e) => setMinPay(Number(e.target.value) || 0)}
          className="max-w-[160px]"
        />
        {minPay > 0 && (
          <button
            onClick={() => setMinPay(0)}
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Clear min pay
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <EmptyState
          title="No listings found"
          description="There are no open listings matching your filters. Try adjusting your search criteria."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredAndSorted.map((listing) => (
            <MarketplaceListingCard
              key={listing.id}
              listing={listing}
              mode={mode}
              onPlaceBid={onPlaceBid}
            />
          ))}
        </div>
      )}
    </div>
  );
}

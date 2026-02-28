'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Star, Clock, Plus, X, Users, AlertCircle, List, Navigation } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Address, Contractor } from '@/types/contractor';
import { TimeBlock, TIME_BLOCK_CONFIG } from '@/types/availability';
import { ContractorRecommendation, getRatingTierInfo } from '@/types/scheduling';
import { getContractorRecommendations, getAllActiveContractors } from '@/lib/firebase/recommendations';
import { getContractor } from '@/lib/firebase/contractors';
import { formatDistance, getDistanceCategory } from '@/lib/utils/distance';

interface ContractorRecommendationsProps {
  jobLocation: Address | null;
  scheduledDate?: Date;
  timeBlock?: TimeBlock;
  selectedCrewIds: string[];
  onSelect: (contractor: Contractor) => void;
  onRemove: (contractorId: string) => void;
}

export function ContractorRecommendations({
  jobLocation,
  scheduledDate,
  timeBlock,
  selectedCrewIds,
  onSelect,
  onRemove,
}: ContractorRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<ContractorRecommendation[]>([]);
  const [allContractors, setAllContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [selectedContractorData, setSelectedContractorData] = useState<Record<string, Contractor>>({});
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  // Fetch contractor data for selected IDs not yet loaded
  useEffect(() => {
    const unfetchedIds = selectedCrewIds.filter(id => !fetchedIdsRef.current.has(id));
    if (unfetchedIds.length === 0) return;

    unfetchedIds.forEach(id => fetchedIdsRef.current.add(id));

    async function fetchMissing() {
      const fetched: Record<string, Contractor> = {};
      await Promise.all(unfetchedIds.map(async (id) => {
        const contractor = await getContractor(id);
        if (contractor) fetched[id] = contractor;
      }));
      if (Object.keys(fetched).length > 0) {
        setSelectedContractorData(prev => ({ ...prev, ...fetched }));
      }
    }
    fetchMissing();
  }, [selectedCrewIds]);

  // Fetch recommendations when date/time/location change
  useEffect(() => {
    async function fetchRecommendations() {
      if (!scheduledDate || !timeBlock || !jobLocation) {
        setRecommendations([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const results = await getContractorRecommendations(
          scheduledDate,
          timeBlock,
          jobLocation
        );
        setRecommendations(results);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError('Failed to load recommendations');
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [scheduledDate, timeBlock, jobLocation]);

  // Fetch all contractors when showAll is enabled
  useEffect(() => {
    async function fetchAllContractors() {
      if (!showAll) return;

      setLoading(true);
      setError(null);

      try {
        const contractors = await getAllActiveContractors();
        setAllContractors(contractors);
      } catch (err) {
        console.error('Error fetching all contractors:', err);
        setError('Failed to load contractors');
      } finally {
        setLoading(false);
      }
    }

    fetchAllContractors();
  }, [showAll]);

  // Get available (not yet selected) contractors
  const availableContractors = showAll
    ? allContractors.filter(c => !selectedCrewIds.includes(c.id))
    : recommendations.filter(r => !selectedCrewIds.includes(r.contractorId));

  // Show toggle even without date/time if user wants to see all
  const canShowRecommendations = scheduledDate && timeBlock && jobLocation?.lat && jobLocation?.lng;

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={!showAll ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowAll(false)}
            disabled={!canShowRecommendations}
          >
            <Navigation className="h-4 w-4 mr-1" />
            Nearby
          </Button>
          <Button
            variant={showAll ? 'primary' : 'outline'}
            size="sm"
            onClick={() => setShowAll(true)}
          >
            <List className="h-4 w-4 mr-1" />
            All Contractors
          </Button>
        </div>
        {!canShowRecommendations && !showAll && (
          <span className="text-sm text-gray-400">
            Select date, time & location for nearby recommendations
          </span>
        )}
      </div>

      {/* Selected Crew */}
      {selectedCrewIds.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-5 w-5 text-gold" />
            <h3 className="font-medium text-white">Selected Crew ({selectedCrewIds.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCrewIds.map((id) => {
              const contractor = selectedContractorData[id];
              if (!contractor) {
                return (
                  <div key={id} className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                    <span className="text-gray-400 text-sm">Loading...</span>
                    <button
                      onClick={() => onRemove(id)}
                      className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              }
              const rating = contractor.rating?.overall || 3;
              const tierInfo = getRatingTierInfo(rating);
              return (
                <div
                  key={id}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg"
                >
                  <span className="text-white font-medium">
                    {contractor.businessName || 'Contractor'}
                  </span>
                  <Badge className={`${tierInfo.bgColor} ${tierInfo.color}`}>
                    {tierInfo.label}
                  </Badge>
                  <button
                    onClick={() => onRemove(contractor.id)}
                    className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Contractors List */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-white">
            {showAll ? 'All Contractors' : 'Recommended Contractors'}
          </h3>
          {!showAll && scheduledDate && timeBlock && (
            <div className="text-sm text-gray-400">
              {TIME_BLOCK_CONFIG[timeBlock].label} • {scheduledDate.toLocaleDateString()}
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 py-4 text-red-400">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        ) : !showAll && !canShowRecommendations ? (
          <div className="flex items-center gap-3 text-gray-500 py-4">
            <Clock className="h-5 w-5" />
            <p>Select a date, time block, and ensure the job has coordinates to see nearby recommendations, or click &quot;All Contractors&quot; to see everyone.</p>
          </div>
        ) : availableContractors.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {showAll
              ? 'No active contractors found'
              : recommendations.length === 0
                ? 'No contractors available for this time slot'
                : 'All available contractors have been selected'}
          </div>
        ) : showAll ? (
          <div className="space-y-3">
            {(availableContractors as Contractor[]).map((contractor) => (
              <AllContractorCard
                key={contractor.id}
                contractor={contractor}
                onSelect={() => onSelect(contractor)}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(availableContractors as ContractorRecommendation[]).map((rec) => (
              <RecommendationCard
                key={rec.contractorId}
                recommendation={rec}
                onSelect={() => onSelect(rec.contractor)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: ContractorRecommendation;
  onSelect: () => void;
}

function RecommendationCard({ recommendation, onSelect }: RecommendationCardProps) {
  const {
    contractor,
    score,
    distance,
    rating,
    availabilityStatus,
    isWithinServiceRadius,
    breakdown,
  } = recommendation;

  const tierInfo = getRatingTierInfo(rating);
  const distanceCategory = getDistanceCategory(distance);
  const isAvailable = availabilityStatus === 'available';

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-medium text-white">
            {contractor.businessName || 'Contractor'}
          </span>
          <Badge className={`${tierInfo.bgColor} ${tierInfo.color}`}>
            {tierInfo.label}
          </Badge>
          {!isAvailable && (
            <Badge variant="warning">
              {availabilityStatus === 'busy' ? 'Busy' : 'Unavailable'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-gold fill-gold" />
            <span className="text-gray-300">{rating.toFixed(1)}</span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-1">
            <MapPin className={`h-4 w-4 ${distanceCategory.color}`} />
            <span className={distanceCategory.color}>
              {formatDistance(distance)}
            </span>
            {!isWithinServiceRadius && (
              <span className="text-red-400 text-xs">(outside service area)</span>
            )}
          </div>

          {/* Score breakdown (optional, for transparency) */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
            <span>Score: {score}</span>
            <span className="text-gray-600">|</span>
            <span>A:{breakdown.availabilityScore}</span>
            <span>D:{breakdown.distanceScore}</span>
            <span>R:{breakdown.ratingScore}</span>
          </div>
        </div>

        {/* Trades */}
        {contractor.trades && contractor.trades.length > 0 && (
          <div className="flex gap-1 mt-2">
            {contractor.trades.map(trade => (
              <span
                key={trade}
                className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded capitalize"
              >
                {trade.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      <Button
        size="sm"
        variant={isAvailable ? 'primary' : 'outline'}
        onClick={onSelect}
        className="ml-4"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
    </div>
  );
}

interface AllContractorCardProps {
  contractor: Contractor;
  onSelect: () => void;
}

function AllContractorCard({ contractor, onSelect }: AllContractorCardProps) {
  const rating = contractor.rating?.overall || 3;
  const tierInfo = getRatingTierInfo(rating);
  const hasLocation = contractor.address?.lat && contractor.address?.lng;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-3 mb-1">
          <span className="font-medium text-white">
            {contractor.businessName || 'Contractor'}
          </span>
          <Badge className={`${tierInfo.bgColor} ${tierInfo.color}`}>
            {tierInfo.label}
          </Badge>
          {!hasLocation && (
            <Badge variant="warning">
              No Location
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4 text-sm">
          {/* Rating */}
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-gold fill-gold" />
            <span className="text-gray-300">{rating.toFixed(1)}</span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1 text-gray-400">
            <MapPin className="h-4 w-4" />
            <span>
              {contractor.address?.city && contractor.address?.state
                ? `${contractor.address.city}, ${contractor.address.state}`
                : 'No address'}
            </span>
          </div>
        </div>

        {/* Trades */}
        {contractor.trades && contractor.trades.length > 0 && (
          <div className="flex gap-1 mt-2">
            {contractor.trades.map(trade => (
              <span
                key={trade}
                className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded capitalize"
              >
                {trade.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </div>

      <Button
        size="sm"
        variant="primary"
        onClick={onSelect}
        className="ml-4"
      >
        <Plus className="h-4 w-4 mr-1" />
        Add
      </Button>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Job } from '@/types/job';
import { Contractor } from '@/types/contractor';
import { Availability, TIME_BLOCK_CONFIG, TimeBlock } from '@/types/availability';
import { getAllContractorsAvailability } from '@/lib/firebase/availability';
import {
  getScheduleRecommendations,
  ScheduleRecommendation,
} from '@/lib/ai/smartScheduler';
import { formatDistance, getDistanceCategory } from '@/lib/utils/distance';

// ============================================================
// Props
// ============================================================

interface SmartSchedulePanelProps {
  jobId: string;
}

// ============================================================
// Helper: star display
// ============================================================

function StarRating({ rating }: { rating: number }) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  return (
    <span className="inline-flex items-center gap-0.5 text-sm">
      {Array.from({ length: fullStars }).map((_, i) => (
        <span key={`f-${i}`} className="text-yellow-400">&#9733;</span>
      ))}
      {hasHalf && <span className="text-yellow-400">&#9734;</span>}
      {Array.from({ length: emptyStars }).map((_, i) => (
        <span key={`e-${i}`} className="text-gray-600">&#9733;</span>
      ))}
      <span className="ml-1 text-gray-400">{rating.toFixed(1)}</span>
    </span>
  );
}

// ============================================================
// Tier badge
// ============================================================

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    elite: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    pro: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    standard: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
    needs_improvement: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    probation: 'bg-red-500/20 text-red-300 border-red-500/40',
  };

  const colorClass = colors[tier] || colors.standard;

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colorClass} capitalize`}>
      {tier.replace('_', ' ')}
    </span>
  );
}

// ============================================================
// Score breakdown
// ============================================================

function ScoreBreakdown({ breakdown }: { breakdown: ScheduleRecommendation['scoreBreakdown'] }) {
  const items = [
    { label: 'Availability', value: breakdown.availability, weight: '30%' },
    { label: 'Distance', value: breakdown.distance, weight: '25%' },
    { label: 'Rating', value: breakdown.rating, weight: '20%' },
    { label: 'Workload', value: breakdown.workload, weight: '15%' },
    { label: 'History', value: breakdown.historicalPerformance, weight: '10%' },
  ];

  return (
    <div className="mt-2 space-y-1">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2 text-xs">
          <span className="w-20 text-gray-500">{item.label}</span>
          <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${item.value}%` }}
            />
          </div>
          <span className="w-8 text-right text-gray-400">{item.value}</span>
          <span className="w-8 text-right text-gray-600">{item.weight}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function SmartSchedulePanel({ jobId }: SmartSchedulePanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<ScheduleRecommendation[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const fetchAndCompute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. Fetch the job
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      if (!jobDoc.exists()) {
        setError('Job not found.');
        setLoading(false);
        return;
      }
      const job = { id: jobDoc.id, ...jobDoc.data() } as Job;

      // 2. Fetch active contractors with installer trade
      const contractorsQuery = query(
        collection(db, 'contractors'),
        where('status', '==', 'active'),
        where('trades', 'array-contains', 'installer')
      );
      const contractorsSnap = await getDocs(contractorsQuery);
      const contractors = contractorsSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as Contractor
      );

      if (contractors.length === 0) {
        setError('No active installer contractors found.');
        setLoading(false);
        return;
      }

      // 3. Fetch availability for all contractors (next 7 days)
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const contractorIds = contractors.map((c) => c.id);
      const availabilityMap = await getAllContractorsAvailability(
        contractorIds,
        today,
        nextWeek
      );

      // 4. Fetch active job counts per contractor
      const activeJobCounts = new Map<string, number>();
      for (const cid of contractorIds) {
        const jobsQuery = query(
          collection(db, 'jobs'),
          where('crewIds', 'array-contains', cid),
          where('status', 'in', ['scheduled', 'started', 'production'])
        );
        const snap = await getDocs(jobsQuery);
        activeJobCounts.set(cid, snap.size);
      }

      // 5. Compute recommendations
      const recs = getScheduleRecommendations(
        job,
        contractors,
        availabilityMap,
        activeJobCounts
      );

      setRecommendations(recs);
    } catch (err) {
      console.error('SmartSchedulePanel error:', err);
      setError('Failed to compute recommendations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchAndCompute();
  }, [fetchAndCompute]);

  const handleAssign = async (rec: ScheduleRecommendation) => {
    setAssigningId(rec.contractorId);
    try {
      const { updateDoc: updateDocFn } = await import('firebase/firestore');
      const jobRef = doc(db, 'jobs', jobId);
      await updateDocFn(jobRef, {
        crewIds: [rec.contractorId],
        'dates.scheduledStart': new Date(`${rec.date}T${TIME_BLOCK_CONFIG[rec.timeBlock].start}:00:00`),
        status: 'scheduled',
      });
      // Refresh recommendations
      await fetchAndCompute();
    } catch (err) {
      console.error('Assignment error:', err);
      setError('Failed to assign contractor.');
    } finally {
      setAssigningId(null);
    }
  };

  // ---- Render ----

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-400 text-sm font-bold">AI</span>
          </div>
          <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-gray-700/50 rounded-lg animate-pulse" />
          ))}
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          Analyzing contractors and availability...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <span className="text-red-400 text-sm font-bold">!</span>
          </div>
          <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
        </div>
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchAndCompute}
          className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
            <span className="text-blue-400 text-sm font-bold">AI</span>
          </div>
          <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-400">No suitable contractors found for this job.</p>
          <p className="text-gray-500 text-sm mt-1">
            Check that contractors have availability set and are within service range.
          </p>
        </div>
      </div>
    );
  }

  // Show top 3
  const top3 = recommendations.slice(0, 3);

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <span className="text-blue-400 text-sm font-bold">AI</span>
        </div>
        <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
      </div>

      <div className="space-y-3">
        {top3.map((rec, index) => {
          const isExpanded = expandedId === rec.contractorId;
          const distCategory = rec.distanceMiles >= 0
            ? getDistanceCategory(rec.distanceMiles)
            : null;

          return (
            <div
              key={rec.contractorId}
              className="bg-gray-900/60 border border-gray-700/60 rounded-lg p-4 hover:border-gray-600 transition-colors"
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-500">
                      #{index + 1}
                    </span>
                    <span className="text-white font-medium truncate">
                      {rec.contractorName}
                    </span>
                    <TierBadge tier={rec.contractorTier} />
                  </div>

                  <div className="mt-1">
                    <StarRating rating={rec.contractorRating} />
                  </div>

                  {/* Distance & time block */}
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                    {rec.distanceMiles >= 0 ? (
                      <span className={distCategory?.color || ''}>
                        {formatDistance(rec.distanceMiles)} &middot; {rec.estimatedTravelTime}
                      </span>
                    ) : (
                      <span className="text-gray-600">Distance unknown</span>
                    )}
                    <span className="text-gray-600">|</span>
                    <span>
                      {TIME_BLOCK_CONFIG[rec.timeBlock].label} &middot; {rec.date}
                    </span>
                  </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                      rec.score >= 80
                        ? 'border-green-500 text-green-400'
                        : rec.score >= 60
                        ? 'border-blue-500 text-blue-400'
                        : rec.score >= 40
                        ? 'border-yellow-500 text-yellow-400'
                        : 'border-red-500 text-red-400'
                    }`}
                  >
                    {rec.score}
                  </div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-wide">Score</span>
                </div>
              </div>

              {/* Expandable breakdown */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : rec.contractorId)}
                className="mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                {isExpanded ? 'Hide breakdown' : 'Show breakdown'}
              </button>

              {isExpanded && <ScoreBreakdown breakdown={rec.scoreBreakdown} />}

              {/* Assign button */}
              <div className="mt-3">
                <button
                  onClick={() => handleAssign(rec)}
                  disabled={assigningId === rec.contractorId}
                  className={`w-full py-2 text-sm font-medium rounded-lg transition-colors ${
                    assigningId === rec.contractorId
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
                >
                  {assigningId === rec.contractorId ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Job } from '@/types/job';
import { Contractor } from '@/types/contractor';
import { Availability, TIME_BLOCK_CONFIG } from '@/types/availability';
import { getAllContractorsAvailability } from '@/lib/firebase/availability';
import {
  optimizeBulkSchedule,
  BulkScheduleResult,
} from '@/lib/ai/smartScheduler';
import { formatDistance } from '@/lib/utils/distance';

// ============================================================
// Component
// ============================================================

export default function BulkScheduleOptimizer() {
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<BulkScheduleResult[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ---- Fetch data and run optimizer ----

  const runOptimization = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSelected(new Set());

    try {
      // 1. Fetch unscheduled jobs: status 'sold' or 'scheduled' without scheduledStart
      const soldQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'sold')
      );
      const scheduledQuery = query(
        collection(db, 'jobs'),
        where('status', '==', 'scheduled')
      );

      const [soldSnap, scheduledSnap] = await Promise.all([
        getDocs(soldQuery),
        getDocs(scheduledQuery),
      ]);

      const allJobs: Job[] = [];

      soldSnap.docs.forEach((d) => {
        allJobs.push({ id: d.id, ...d.data() } as Job);
      });

      scheduledSnap.docs.forEach((d) => {
        const job = { id: d.id, ...d.data() } as Job;
        // Only include scheduled jobs that lack a scheduledStart date
        if (!job.dates?.scheduledStart) {
          allJobs.push(job);
        }
      });

      if (allJobs.length === 0) {
        setError('No unscheduled jobs found. All jobs either have dates assigned or are in other statuses.');
        setLoading(false);
        return;
      }

      // 2. Fetch active installer contractors
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
        setError('No active installer contractors available.');
        setLoading(false);
        return;
      }

      // 3. Get availability for next 7 days
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const contractorIds = contractors.map((c) => c.id);
      const availabilityMap = await getAllContractorsAvailability(
        contractorIds,
        today,
        nextWeek
      );

      // 4. Active job counts
      const activeJobCounts = new Map<string, number>();
      for (const cid of contractorIds) {
        const q = query(
          collection(db, 'jobs'),
          where('crewIds', 'array-contains', cid),
          where('status', 'in', ['scheduled', 'started', 'production'])
        );
        const snap = await getDocs(q);
        activeJobCounts.set(cid, snap.size);
      }

      // 5. Run optimizer
      const optimized = optimizeBulkSchedule(
        allJobs,
        contractors,
        availabilityMap,
        activeJobCounts
      );

      setResults(optimized);

      // Auto-select all that have an assignment
      const autoSelected = new Set<string>();
      optimized.forEach((r) => {
        if (r.assigned) autoSelected.add(r.jobId);
      });
      setSelected(autoSelected);
    } catch (err) {
      console.error('BulkScheduleOptimizer error:', err);
      setError('Failed to run optimization. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ---- Apply selected assignments ----

  const applySelected = useCallback(async () => {
    if (!results) return;

    setApplying(true);
    setError(null);

    try {
      const toApply = results.filter(
        (r) => r.assigned && selected.has(r.jobId)
      );

      const promises = toApply.map(async (r) => {
        if (!r.assigned) return;
        const jobRef = doc(db, 'jobs', r.jobId);
        const startHour = TIME_BLOCK_CONFIG[r.assigned.timeBlock].start;
        const scheduledDate = new Date(`${r.assigned.date}T${String(startHour).padStart(2, '0')}:00:00`);

        await updateDoc(jobRef, {
          crewIds: [r.assigned.contractorId],
          'dates.scheduledStart': scheduledDate,
          status: 'scheduled',
        });
      });

      await Promise.all(promises);

      // Re-run to refresh the view
      await runOptimization();
    } catch (err) {
      console.error('Apply error:', err);
      setError('Failed to apply some assignments. Please try again.');
    } finally {
      setApplying(false);
    }
  }, [results, selected, runOptimization]);

  // ---- Toggle selection ----

  const toggleSelect = (jobId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (!results) return;
    const assignable = results.filter((r) => r.assigned);
    if (selected.size === assignable.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(assignable.map((r) => r.jobId)));
    }
  };

  // ---- Summary stats ----

  const stats = results
    ? {
        totalJobs: results.length,
        scheduled: results.filter((r) => r.assigned).length,
        unmatched: results.filter((r) => !r.assigned).length,
        avgScore:
          results.filter((r) => r.assigned).length > 0
            ? Math.round(
                results
                  .filter((r) => r.assigned)
                  .reduce((sum, r) => sum + (r.assigned?.score || 0), 0) /
                  results.filter((r) => r.assigned).length
              )
            : 0,
        totalDistance: Math.round(
          results
            .filter((r) => r.assigned && r.assigned.distanceMiles >= 0)
            .reduce((sum, r) => sum + (r.assigned?.distanceMiles || 0), 0) * 10
        ) / 10,
      }
    : null;

  // ---- Render ----

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Bulk Schedule Optimizer</h2>
          <p className="text-gray-400 text-sm mt-1">
            AI-powered contractor assignment for unscheduled jobs
          </p>
        </div>
        <button
          onClick={runOptimization}
          disabled={loading}
          className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-colors ${
            loading
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          {loading ? 'Optimizing...' : 'Optimize Schedule'}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-gray-800/50 rounded-lg animate-pulse" />
          ))}
          <p className="text-center text-gray-500 text-sm">
            Analyzing jobs, contractors, and availability...
          </p>
        </div>
      )}

      {/* Results */}
      {results && !loading && (
        <>
          {/* Summary stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Jobs Found" value={String(stats.totalJobs)} />
              <StatCard
                label="Scheduled"
                value={String(stats.scheduled)}
                accent="green"
              />
              <StatCard
                label="Avg Score"
                value={String(stats.avgScore)}
                accent="blue"
              />
              <StatCard
                label="Total Distance"
                value={`${stats.totalDistance} mi`}
                accent="yellow"
              />
            </div>
          )}

          {/* Results table */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[auto_1fr_1fr_1fr_80px_80px] gap-3 px-4 py-3 bg-gray-900/60 border-b border-gray-700 text-xs font-medium text-gray-500 uppercase tracking-wide">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={
                    results.filter((r) => r.assigned).length > 0 &&
                    selected.size === results.filter((r) => r.assigned).length
                  }
                  onChange={toggleAll}
                  className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/20"
                />
              </div>
              <div>Job</div>
              <div>Customer</div>
              <div>Recommended Contractor</div>
              <div className="text-center">Score</div>
              <div className="text-center">Distance</div>
            </div>

            {/* Table body */}
            <div className="divide-y divide-gray-700/50">
              {results.map((result) => (
                <div
                  key={result.jobId}
                  className={`grid grid-cols-[auto_1fr_1fr_1fr_80px_80px] gap-3 px-4 py-3 items-center text-sm transition-colors ${
                    result.assigned
                      ? 'hover:bg-gray-700/30'
                      : 'opacity-50'
                  }`}
                >
                  <div>
                    <input
                      type="checkbox"
                      checked={selected.has(result.jobId)}
                      onChange={() => toggleSelect(result.jobId)}
                      disabled={!result.assigned}
                      className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500/20 disabled:opacity-30"
                    />
                  </div>
                  <div className="text-white font-medium truncate">
                    {result.jobNumber}
                  </div>
                  <div className="text-gray-300 truncate">
                    {result.customerName}
                  </div>
                  <div className="truncate">
                    {result.assigned ? (
                      <span className="text-gray-200">
                        {result.assigned.contractorName}
                        <span className="text-gray-500 ml-1 text-xs">
                          {TIME_BLOCK_CONFIG[result.assigned.timeBlock].shortLabel}
                        </span>
                      </span>
                    ) : (
                      <span className="text-red-400 text-xs">No match found</span>
                    )}
                  </div>
                  <div className="text-center">
                    {result.assigned ? (
                      <span
                        className={`inline-block w-8 h-8 leading-8 rounded-full text-xs font-bold ${
                          result.assigned.score >= 80
                            ? 'bg-green-500/20 text-green-400'
                            : result.assigned.score >= 60
                            ? 'bg-blue-500/20 text-blue-400'
                            : result.assigned.score >= 40
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {result.assigned.score}
                      </span>
                    ) : (
                      <span className="text-gray-600">--</span>
                    )}
                  </div>
                  <div className="text-center text-gray-400 text-xs">
                    {result.assigned && result.assigned.distanceMiles >= 0
                      ? formatDistance(result.assigned.distanceMiles)
                      : '--'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Apply button */}
          {results.some((r) => r.assigned) && (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <p className="text-gray-500 text-sm">
                {selected.size} of {results.filter((r) => r.assigned).length} assignments selected
              </p>
              <button
                onClick={applySelected}
                disabled={applying || selected.size === 0}
                className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                  applying || selected.size === 0
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-500 text-white'
                }`}
              >
                {applying
                  ? 'Applying...'
                  : `Apply Selected (${selected.size})`}
              </button>
            </div>
          )}
        </>
      )}

      {/* Empty state before running */}
      {!results && !loading && !error && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-blue-400 text-2xl font-bold">AI</span>
          </div>
          <h3 className="text-white font-medium text-lg">Ready to Optimize</h3>
          <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
            Click &quot;Optimize Schedule&quot; to analyze unscheduled jobs and find the best
            contractor assignments based on availability, distance, rating, and workload.
          </p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Stat Card
// ============================================================

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'green' | 'blue' | 'yellow' | 'red';
}) {
  const accentColors = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    yellow: 'text-yellow-400',
    red: 'text-red-400',
  };

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-3">
      <p className="text-gray-500 text-xs uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent ? accentColors[accent] : 'text-white'}`}>
        {value}
      </p>
    </div>
  );
}

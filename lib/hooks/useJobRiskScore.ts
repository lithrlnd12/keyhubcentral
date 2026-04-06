'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { getJob } from '@/lib/firebase/jobs';
import { getContractor } from '@/lib/firebase/contractors';
import { getInstallerHistoricalData } from '@/lib/ai/riskModel';
import {
  calculateJobRiskScore,
  RiskScore,
  HistoricalData,
} from '@/lib/ai/riskScoring';
import { Job } from '@/types/job';
import { Contractor } from '@/types/contractor';

interface UseJobRiskScoreReturn {
  riskScore: RiskScore | null;
  loading: boolean;
  error: string | null;
}

/**
 * Hook that fetches job, contractor, and historical data,
 * then calculates the callback risk score.
 *
 * Results are memoized: the score is only recalculated when
 * the underlying data changes.
 */
export function useJobRiskScore(jobId: string): UseJobRiskScoreReturn {
  const [job, setJob] = useState<Job | null>(null);
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [historicalData, setHistoricalData] = useState<HistoricalData | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Track which jobId we last fetched to avoid stale updates
  const fetchedJobIdRef = useRef<string>('');

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setContractor(null);
      setHistoricalData(undefined);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetchedJobIdRef.current = jobId;

    async function fetchData() {
      try {
        setLoading(true);
        setError(null);

        // Step 1: Fetch the job
        const fetchedJob = await getJob(jobId);
        if (cancelled) return;

        if (!fetchedJob) {
          setError('Job not found');
          setLoading(false);
          return;
        }

        setJob(fetchedJob);

        // Step 2: Fetch the contractor (first crew member or null)
        const contractorId = fetchedJob.crewIds?.[0] || null;
        let fetchedContractor: Contractor | null = null;
        let fetchedHistorical: HistoricalData | undefined;

        if (contractorId) {
          const [contractorResult, historicalResult] = await Promise.all([
            getContractor(contractorId),
            getInstallerHistoricalData(contractorId),
          ]);
          if (cancelled) return;

          fetchedContractor = contractorResult;
          fetchedHistorical = historicalResult;
        }

        setContractor(fetchedContractor);
        setHistoricalData(fetchedHistorical);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to calculate risk score'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // Memoize the risk score calculation
  const riskScore = useMemo(() => {
    if (!job) return null;
    return calculateJobRiskScore(job, contractor, historicalData);
  }, [job, contractor, historicalData]);

  return { riskScore, loading, error };
}

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Job } from '@/types/job';
import { Availability, BlockStatus, getDefaultBlocks, formatDateKey } from '@/types/availability';
import { subscribeToContractorJobs } from '@/lib/firebase/jobs';
import { subscribeToMonthAvailability } from '@/lib/firebase/availability';

export interface ScheduleDay {
  date: string; // YYYY-MM-DD
  dateObj: Date;
  jobs: Job[];
  availability: BlockStatus | null;
  isSyncedFromGoogle: boolean;
}

interface UseContractorScheduleOptions {
  contractorId: string;
  year: number;
  month: number; // 0-indexed
}

interface UseContractorScheduleReturn {
  days: Map<string, ScheduleDay>;
  loading: boolean;
  error: string | null;
  getScheduleDay: (date: Date) => ScheduleDay;
  jobsThisMonth: Job[];
  scheduledJobsCount: number;
}

export function useContractorSchedule(
  options: UseContractorScheduleOptions
): UseContractorScheduleReturn {
  const { contractorId, year, month } = options;

  const [jobs, setJobs] = useState<Job[]>([]);
  const [availability, setAvailability] = useState<Map<string, Availability>>(new Map());
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate month boundaries
  const monthStart = useMemo(() => new Date(year, month, 1), [year, month]);
  const monthEnd = useMemo(() => new Date(year, month + 1, 0), [year, month]);

  // Subscribe to jobs
  useEffect(() => {
    if (!contractorId) {
      setLoadingJobs(false);
      return;
    }

    setLoadingJobs(true);
    setError(null);

    const unsubscribe = subscribeToContractorJobs(contractorId, (data) => {
      setJobs(data);
      setLoadingJobs(false);
    });

    return unsubscribe;
  }, [contractorId]);

  // Subscribe to availability for the month
  useEffect(() => {
    if (!contractorId) {
      setLoadingAvailability(false);
      return;
    }

    setLoadingAvailability(true);

    const unsubscribe = subscribeToMonthAvailability(
      contractorId,
      year,
      month,
      (availabilityMap) => {
        setAvailability(availabilityMap);
        setLoadingAvailability(false);
      }
    );

    return unsubscribe;
  }, [contractorId, year, month]);

  // Filter jobs that have scheduledStart within this month
  const jobsThisMonth = useMemo(() => {
    return jobs.filter((job) => {
      if (!job.dates?.scheduledStart) return false;
      const scheduledDate = job.dates.scheduledStart.toDate
        ? job.dates.scheduledStart.toDate()
        : new Date(job.dates.scheduledStart);
      return scheduledDate >= monthStart && scheduledDate <= monthEnd;
    });
  }, [jobs, monthStart, monthEnd]);

  // Group jobs by date
  const jobsByDate = useMemo(() => {
    const map = new Map<string, Job[]>();

    jobsThisMonth.forEach((job) => {
      if (!job.dates?.scheduledStart) return;
      const scheduledDate = job.dates.scheduledStart.toDate
        ? job.dates.scheduledStart.toDate()
        : new Date(job.dates.scheduledStart);
      const dateKey = formatDateKey(scheduledDate);

      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(job);
    });

    return map;
  }, [jobsThisMonth]);

  // Build schedule days map
  const days = useMemo(() => {
    const scheduleMap = new Map<string, ScheduleDay>();

    // Create entries for all days in the month
    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dateKey = formatDateKey(d);
      const dateObj = new Date(d);
      const dayAvailability = availability.get(dateKey);

      scheduleMap.set(dateKey, {
        date: dateKey,
        dateObj,
        jobs: jobsByDate.get(dateKey) || [],
        availability: dayAvailability?.blocks || null,
        isSyncedFromGoogle: dayAvailability?.syncSource === 'google',
      });
    }

    return scheduleMap;
  }, [monthStart, monthEnd, jobsByDate, availability]);

  // Get schedule for a specific day
  const getScheduleDay = useCallback((date: Date): ScheduleDay => {
    const dateKey = formatDateKey(date);
    const existing = days.get(dateKey);

    if (existing) {
      return existing;
    }

    // Return default for dates outside the current month
    const dayAvailability = availability.get(dateKey);
    return {
      date: dateKey,
      dateObj: date,
      jobs: [],
      availability: dayAvailability?.blocks || null,
      isSyncedFromGoogle: dayAvailability?.syncSource === 'google',
    };
  }, [days, availability]);

  // Count of scheduled jobs this month
  const scheduledJobsCount = useMemo(() => {
    return jobsThisMonth.length;
  }, [jobsThisMonth]);

  return {
    days,
    loading: loadingJobs || loadingAvailability,
    error,
    getScheduleDay,
    jobsThisMonth,
    scheduledJobsCount,
  };
}

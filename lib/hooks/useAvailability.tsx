'use client';

import { useState, useEffect, useCallback } from 'react';
import { Availability, AvailabilityStatus } from '@/types/availability';
import {
  subscribeToMonthAvailability,
  setAvailability,
  clearAvailability,
} from '@/lib/firebase/availability';

interface UseAvailabilityOptions {
  contractorId: string;
  year: number;
  month: number; // 0-indexed
}

interface UseAvailabilityReturn {
  availability: Map<string, Availability>;
  loading: boolean;
  error: string | null;
  setDayStatus: (date: Date, status: AvailabilityStatus, notes?: string) => Promise<void>;
  clearDay: (date: Date) => Promise<void>;
}

export function useAvailability({
  contractorId,
  year,
  month,
}: UseAvailabilityOptions): UseAvailabilityReturn {
  const [availability, setAvailabilityState] = useState<Map<string, Availability>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to month availability
  useEffect(() => {
    if (!contractorId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = subscribeToMonthAvailability(
      contractorId,
      year,
      month,
      (data) => {
        setAvailabilityState(data);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [contractorId, year, month]);

  // Set day status
  const setDayStatus = useCallback(
    async (date: Date, status: AvailabilityStatus, notes?: string) => {
      if (!contractorId) return;

      try {
        await setAvailability(contractorId, date, status, notes);
      } catch (err) {
        console.error('Error setting availability:', err);
        setError('Failed to update availability');
        throw err;
      }
    },
    [contractorId]
  );

  // Clear day
  const clearDay = useCallback(
    async (date: Date) => {
      if (!contractorId) return;

      try {
        await clearAvailability(contractorId, date);
      } catch (err) {
        console.error('Error clearing availability:', err);
        setError('Failed to clear availability');
        throw err;
      }
    },
    [contractorId]
  );

  return {
    availability,
    loading,
    error,
    setDayStatus,
    clearDay,
  };
}

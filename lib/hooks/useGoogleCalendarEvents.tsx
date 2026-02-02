'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  isAllDay: boolean;
  isBusy: boolean;
  isKeyHubEvent: boolean;
  htmlLink?: string;
  location?: string;
}

interface UseGoogleCalendarEventsProps {
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
}

interface UseGoogleCalendarEventsReturn {
  events: GoogleCalendarEvent[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useGoogleCalendarEvents({
  startDate,
  endDate,
  enabled = true,
}: UseGoogleCalendarEventsProps): UseGoogleCalendarEventsReturn {
  const { getIdToken } = useAuth();
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const token = await getIdToken();
      if (!token) {
        setError('Not authenticated');
        return;
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const response = await fetch(`/api/google-calendar/events?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Don't show error if calendar just isn't connected
        if (data.error === 'Google Calendar not connected' ||
            data.error === 'Google Calendar not enabled') {
          setEvents([]);
          return;
        }
        throw new Error(data.error || 'Failed to fetch events');
      }

      setEvents(data.events || []);
    } catch (err) {
      console.error('Error fetching Google Calendar events:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, enabled, getIdToken]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return {
    events,
    loading,
    error,
    refetch: fetchEvents,
  };
}

// Helper to get events for a specific date
export function getEventsForDate(
  events: GoogleCalendarEvent[],
  date: Date
): GoogleCalendarEvent[] {
  const dateStr = date.toISOString().split('T')[0];

  return events.filter((event) => {
    const eventStart = event.start.split('T')[0];
    const eventEnd = event.end.split('T')[0];

    // For all-day events, check if date falls within range
    if (event.isAllDay) {
      return dateStr >= eventStart && dateStr < eventEnd;
    }

    // For timed events, check if date matches start date
    return eventStart === dateStr;
  });
}

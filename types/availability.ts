import { Timestamp } from 'firebase/firestore';
import { SyncSource } from './calendarIntegration';

export type AvailabilityStatus = 'available' | 'busy' | 'unavailable' | 'on_leave';

export interface Availability {
  id: string; // Format: YYYY-MM-DD
  date: string;
  status: AvailabilityStatus;
  notes?: string;
  updatedAt: Timestamp;
  // Google Calendar sync fields
  googleEventId?: string; // ID of synced Google Calendar event
  syncSource?: SyncSource; // 'app' or 'google' - where this entry originated
}

export interface DayAvailability {
  date: Date;
  status: AvailabilityStatus;
  notes?: string;
}

// Status display info
export function getAvailabilityInfo(status: AvailabilityStatus): {
  label: string;
  color: string;
  bgColor: string;
} {
  switch (status) {
    case 'available':
      return {
        label: 'Available',
        color: 'text-green-400',
        bgColor: 'bg-green-500/20',
      };
    case 'busy':
      return {
        label: 'Busy',
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-500/20',
      };
    case 'unavailable':
      return {
        label: 'Unavailable',
        color: 'text-red-400',
        bgColor: 'bg-red-500/20',
      };
    case 'on_leave':
      return {
        label: 'On Leave',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
      };
  }
}

// Format date to YYYY-MM-DD
export function formatDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Parse YYYY-MM-DD to Date
export function parseDateKey(key: string): Date {
  return new Date(key + 'T00:00:00');
}

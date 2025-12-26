import { Timestamp } from 'firebase/firestore';

export type SyncStatus = 'success' | 'error' | 'pending' | 'syncing';
export type SyncSource = 'app' | 'google';

export interface GoogleCalendarIntegration {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Timestamp;
  calendarId: string; // 'primary' or specific calendar ID
  enabled: boolean;
  lastSyncAt: Timestamp | null;
  lastSyncStatus: SyncStatus;
  lastSyncError?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Input type for saving (without Timestamps that are auto-generated)
export interface GoogleCalendarIntegrationInput {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date | Timestamp;
  calendarId: string;
  enabled: boolean;
}

// Status mapping for sync events
export const CALENDAR_EVENT_TITLES: Record<string, string> = {
  busy: 'Busy - KeyHub',
  unavailable: 'Unavailable - KeyHub',
  on_leave: 'On Leave - KeyHub',
};

// Identify events created by our app
export const KEYHUB_EVENT_MARKER = 'Synced from KeyHub Central';

import { Timestamp } from 'firebase/firestore';
import { SyncSource } from './calendarIntegration';

export type AvailabilityStatus = 'available' | 'busy' | 'unavailable' | 'on_leave';

// Time blocks for scheduling granularity
export type TimeBlock = 'am' | 'pm' | 'evening';

export const TIME_BLOCK_CONFIG = {
  am: { start: 6, end: 12, label: 'Morning', shortLabel: 'AM' },
  pm: { start: 12, end: 18, label: 'Afternoon', shortLabel: 'PM' },
  evening: { start: 18, end: 22, label: 'Evening', shortLabel: 'EVE' },
} as const;

export const TIME_BLOCKS: TimeBlock[] = ['am', 'pm', 'evening'];

// Block-level availability status
export interface BlockStatus {
  am: AvailabilityStatus;
  pm: AvailabilityStatus;
  evening: AvailabilityStatus;
}

// Google Calendar event IDs for each block
export interface BlockGoogleEventIds {
  am?: string;
  pm?: string;
  evening?: string;
}

// Updated Availability interface with time block support
export interface Availability {
  id: string; // Format: YYYY-MM-DD
  date: string;
  // Block-based availability (new)
  blocks: BlockStatus;
  notes?: string;
  updatedAt: Timestamp;
  // Google Calendar sync fields - now per-block
  googleEventIds?: BlockGoogleEventIds;
  syncSource?: SyncSource;
  // Legacy field - for migration support
  status?: AvailabilityStatus;
  googleEventId?: string;
}

export interface DayAvailability {
  date: Date;
  blocks: BlockStatus;
  notes?: string;
  // Computed overall status for display
  status: AvailabilityStatus;
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

// Get default blocks (all available)
export function getDefaultBlocks(): BlockStatus {
  return {
    am: 'available',
    pm: 'available',
    evening: 'available',
  };
}

// Get the overall status for a day based on blocks
export function getDayStatusFromBlocks(blocks: BlockStatus): AvailabilityStatus {
  const statuses = [blocks.am, blocks.pm, blocks.evening];

  // If all blocks are the same, return that status
  if (statuses.every(s => s === statuses[0])) {
    return statuses[0];
  }

  // If any block is unavailable or on_leave, the day is partially unavailable
  if (statuses.some(s => s === 'unavailable' || s === 'on_leave')) {
    return 'busy';
  }

  // Mixed available/busy = busy
  return 'busy';
}

// Convert legacy single status to block status
export function legacyStatusToBlocks(status: AvailabilityStatus): BlockStatus {
  return {
    am: status,
    pm: status,
    evening: status,
  };
}

// Check if a specific block is available
export function isBlockAvailable(blocks: BlockStatus, block: TimeBlock): boolean {
  return blocks[block] === 'available';
}

// Get time block info by block name
export function getTimeBlockInfo(block: TimeBlock) {
  return TIME_BLOCK_CONFIG[block];
}

// Determine which time block an hour falls into
export function getTimeBlockForHour(hour: number): TimeBlock | null {
  if (hour >= TIME_BLOCK_CONFIG.am.start && hour < TIME_BLOCK_CONFIG.am.end) {
    return 'am';
  }
  if (hour >= TIME_BLOCK_CONFIG.pm.start && hour < TIME_BLOCK_CONFIG.pm.end) {
    return 'pm';
  }
  if (hour >= TIME_BLOCK_CONFIG.evening.start && hour < TIME_BLOCK_CONFIG.evening.end) {
    return 'evening';
  }
  return null;
}

// Get time blocks that overlap with a time range
export function getOverlappingBlocks(startHour: number, endHour: number): TimeBlock[] {
  const blocks: TimeBlock[] = [];

  for (const block of TIME_BLOCKS) {
    const config = TIME_BLOCK_CONFIG[block];
    // Check if ranges overlap
    if (startHour < config.end && endHour > config.start) {
      blocks.push(block);
    }
  }

  return blocks;
}

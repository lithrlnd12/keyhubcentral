import {
  InboundCallStatus,
  ClosedReason,
  PrimaryConcern,
  Urgency,
  EmotionalSignal,
} from '@/types/inboundCall';

// Status configuration
export const INBOUND_CALL_STATUS_CONFIG: Record<
  InboundCallStatus,
  { label: string; color: string; bgColor: string }
> = {
  new: {
    label: 'New',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/30',
  },
  reviewed: {
    label: 'Reviewed',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400/10 border-yellow-400/30',
  },
  contacted: {
    label: 'Contacted',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10 border-purple-400/30',
  },
  converted: {
    label: 'Converted',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10 border-green-400/30',
  },
  closed: {
    label: 'Closed',
    color: 'text-gray-400',
    bgColor: 'bg-gray-400/10 border-gray-400/30',
  },
};

// Closed reason labels
export const CLOSED_REASON_LABELS: Record<ClosedReason, string> = {
  spam: 'Spam',
  wrong_number: 'Wrong Number',
  not_interested: 'Not Interested',
  other: 'Other',
};

// Urgency configuration
export const URGENCY_CONFIG: Record<
  Urgency,
  { label: string; color: string; bgColor: string; priority: number }
> = {
  urgent: {
    label: 'Urgent',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10 border-red-400/30',
    priority: 3,
  },
  ready: {
    label: 'Ready',
    color: 'text-green-400',
    bgColor: 'bg-green-400/10 border-green-400/30',
    priority: 2,
  },
  exploring: {
    label: 'Exploring',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/30',
    priority: 1,
  },
};

// Primary concern labels
export const PRIMARY_CONCERN_LABELS: Record<PrimaryConcern, string> = {
  price: 'Price',
  timeline: 'Timeline',
  warranty: 'Warranty',
  trust: 'Trust/Quality',
};

// Emotional signal configuration
export const EMOTIONAL_SIGNAL_CONFIG: Record<
  EmotionalSignal,
  { label: string; emoji: string }
> = {
  frustrated: { label: 'Frustrated', emoji: '' },
  excited: { label: 'Excited', emoji: '' },
  skeptical: { label: 'Skeptical', emoji: '' },
  neutral: { label: 'Neutral', emoji: '' },
};

/**
 * Format duration in seconds to human-readable string
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle US phone numbers
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Handle US phone numbers with country code
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Return original if we can't format
  return phone;
}

/**
 * Get status label
 */
export function getStatusLabel(status: InboundCallStatus): string {
  return INBOUND_CALL_STATUS_CONFIG[status]?.label || status;
}

/**
 * Get urgency label
 */
export function getUrgencyLabel(urgency: Urgency): string {
  return URGENCY_CONFIG[urgency]?.label || urgency;
}

/**
 * Get concern label
 */
export function getConcernLabel(concern: PrimaryConcern): string {
  return PRIMARY_CONCERN_LABELS[concern] || concern;
}

/**
 * Get closed reason label
 */
export function getClosedReasonLabel(reason: ClosedReason): string {
  return CLOSED_REASON_LABELS[reason] || reason;
}

import { Lead, LeadStatus, LeadSource, LeadQuality } from '@/types/lead';
import { Timestamp } from 'firebase/firestore';

// Status display labels
export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  assigned: 'Assigned',
  contacted: 'Contacted',
  qualified: 'Qualified',
  converted: 'Converted',
  lost: 'Lost',
  returned: 'Returned',
};

// Status colors for badges
export const LEAD_STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  new: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  assigned: { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/30' },
  contacted: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  qualified: { bg: 'bg-indigo-500/20', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  converted: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  lost: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  returned: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
};

// Source display labels
export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  google_ads: 'Google Ads',
  meta: 'Meta (Facebook/Instagram)',
  tiktok: 'TikTok',
  event: 'Event',
  referral: 'Referral',
  other: 'Other',
};

// Source icons/colors
export const LEAD_SOURCE_COLORS: Record<LeadSource, { bg: string; text: string }> = {
  google_ads: { bg: 'bg-blue-500/20', text: 'text-blue-400' },
  meta: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
  tiktok: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
  event: { bg: 'bg-green-500/20', text: 'text-green-400' },
  referral: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
  other: { bg: 'bg-gray-500/20', text: 'text-gray-400' },
};

// Quality labels and colors
export const LEAD_QUALITY_LABELS: Record<LeadQuality, string> = {
  hot: 'Hot',
  warm: 'Warm',
  cold: 'Cold',
};

export const LEAD_QUALITY_COLORS: Record<LeadQuality, { bg: string; text: string; border: string }> = {
  hot: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  warm: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  cold: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
};

// Format status for display
export function formatLeadStatus(status: LeadStatus): string {
  return LEAD_STATUS_LABELS[status] || status;
}

// Format source for display
export function formatLeadSource(source: LeadSource): string {
  return LEAD_SOURCE_LABELS[source] || source;
}

// Format quality for display
export function formatLeadQuality(quality: LeadQuality): string {
  return LEAD_QUALITY_LABELS[quality] || quality;
}

// Check if lead can be returned (within 24 hours)
export function canReturnLead(lead: Lead): boolean {
  if (lead.status === 'returned' || lead.status === 'converted' || lead.status === 'lost') {
    return false;
  }

  if (!lead.createdAt) return false;

  const createdAt = lead.createdAt.toDate();
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

  return hoursSinceCreation <= 24;
}

// Get hours remaining for return window
export function getReturnWindowRemaining(lead: Lead): number | null {
  if (!lead.createdAt) return null;

  const createdAt = lead.createdAt.toDate();
  const now = new Date();
  const hoursSinceCreation = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const hoursRemaining = 24 - hoursSinceCreation;

  return hoursRemaining > 0 ? hoursRemaining : 0;
}

// Get lead count summary
export function getLeadCountSummary(leads: Lead[]): {
  total: number;
  new: number;
  assigned: number;
  converted: number;
  hot: number;
  warm: number;
  cold: number;
} {
  let newCount = 0;
  let assigned = 0;
  let converted = 0;
  let hot = 0;
  let warm = 0;
  let cold = 0;

  leads.forEach((lead) => {
    if (lead.status === 'new') newCount++;
    if (lead.status === 'assigned') assigned++;
    if (lead.status === 'converted') converted++;
    if (lead.quality === 'hot') hot++;
    if (lead.quality === 'warm') warm++;
    if (lead.quality === 'cold') cold++;
  });

  return {
    total: leads.length,
    new: newCount,
    assigned,
    converted,
    hot,
    warm,
    cold,
  };
}

// Group leads by source
export function groupLeadsBySource(leads: Lead[]): Record<LeadSource, Lead[]> {
  const grouped: Record<LeadSource, Lead[]> = {
    google_ads: [],
    meta: [],
    tiktok: [],
    event: [],
    referral: [],
    other: [],
  };

  leads.forEach((lead) => {
    // Handle invalid sources gracefully by grouping them as 'other'
    const source = grouped[lead.source] ? lead.source : 'other';
    grouped[source].push(lead);
  });

  return grouped;
}

// Calculate conversion rate
export function calculateConversionRate(leads: Lead[]): number {
  if (leads.length === 0) return 0;

  const converted = leads.filter((lead) => lead.status === 'converted').length;
  return (converted / leads.length) * 100;
}

// Common trades for leads
export const LEAD_TRADES = [
  'Bathroom',
  'Kitchen',
  'Roofing',
  'Windows',
  'Doors',
  'Siding',
  'HVAC',
  'Flooring',
  'Painting',
  'Other',
];

// Common markets/regions
export const LEAD_MARKETS = [
  'Dallas-Fort Worth',
  'Houston',
  'Austin',
  'San Antonio',
  'Other',
];

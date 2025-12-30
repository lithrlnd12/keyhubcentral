import { Timestamp } from 'firebase/firestore';
import { Address } from './contractor';

export type LeadSource = 'google_ads' | 'meta' | 'tiktok' | 'event' | 'referral' | 'other';
export type LeadQuality = 'hot' | 'warm' | 'cold';
export type LeadStatus =
  | 'new'
  | 'assigned'
  | 'contacted'
  | 'qualified'
  | 'converted'
  | 'lost'
  | 'returned';
export type AssignedType = 'internal' | 'subscriber';

export interface LeadAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface LeadCustomer {
  name: string;
  phone: string | null;
  email: string | null;
  address: Address;
  notes: string | null;
  attachments?: LeadAttachment[];
}

export interface FacebookLeadData {
  leadgenId: string;
  formId: string;
  pageId: string;
  createdTime: number;
}

export interface LeadCallData {
  lastCallAt?: Timestamp | null;
  lastCallId?: string | null;
  lastCallOutcome?: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'failed' | null;
  lastCallSummary?: string | null;
  lastCallTranscript?: string | null;
  lastCallRecordingUrl?: string | null;
  callAnalysis?: Record<string, unknown> | null;
  scheduledCallAt?: Timestamp | null;
  callAttempts?: number;
  contactedAt?: Timestamp | null;
}

export interface Lead extends LeadCallData {
  id: string;
  source: LeadSource;
  campaignId: string | null;
  market: string;
  trade: string;
  customer: LeadCustomer;
  quality: LeadQuality;
  status: LeadStatus;
  assignedTo: string | null;
  assignedType: AssignedType | null;
  returnReason: string | null;
  returnedAt: Timestamp | null;
  facebookData?: FacebookLeadData | null;
  autoCallEnabled?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CampaignPlatform = 'google_ads' | 'meta' | 'tiktok' | 'event' | 'other';

export interface Campaign {
  id: string;
  name: string;
  platform: CampaignPlatform;
  market: string;
  trade: string;
  startDate: Timestamp;
  endDate: Timestamp | null;
  spend: number;
  leadsGenerated: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type SubscriptionTier = 'starter' | 'growth' | 'pro';
export type SubscriptionStatus = 'active' | 'paused' | 'cancelled';

export interface Subscription {
  id: string;
  userId: string;
  tier: SubscriptionTier;
  monthlyFee: number;
  adSpendMin: number;
  leadCap: number;
  status: SubscriptionStatus;
  startDate: Timestamp;
  billingCycle: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Subscription tier details
export const SUBSCRIPTION_TIERS: Record<
  SubscriptionTier,
  { monthlyFee: number; leadRange: string; adSpendMin: number }
> = {
  starter: { monthlyFee: 399, leadRange: '10-15', adSpendMin: 600 },
  growth: { monthlyFee: 899, leadRange: '15-25', adSpendMin: 900 },
  pro: { monthlyFee: 1499, leadRange: 'Flexible', adSpendMin: 1500 },
};

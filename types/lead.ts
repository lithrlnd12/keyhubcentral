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

export interface LeadCustomer {
  name: string;
  phone: string;
  email: string;
  address: Address;
}

export interface Lead {
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

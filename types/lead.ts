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
export type ContactPreference = 'phone' | 'sms';

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

// Structured data extracted from Vapi AI calls
export interface CallAnalysis {
  callOutcome?: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'failed' | string;
  interestLevel?: 'high' | 'very_high' | 'medium' | 'moderate' | 'low' | 'none' | 'not_interested' | string;
  projectType?: string;
  propertyType?: 'personal_home' | 'rental_property' | 'commercial' | string;
  timeline?: string;
  projectDescription?: string;
  additionalNotes?: string;
  confirmedContactInfo?: boolean;
  requestedCallback?: boolean;
  removeFromList?: boolean;
  // Allow additional fields
  [key: string]: unknown;
}

export interface LeadCallData {
  lastCallAt?: Timestamp | null;
  lastCallId?: string | null;
  lastCallOutcome?: 'answered' | 'voicemail' | 'no_answer' | 'busy' | 'failed' | null;
  lastCallSummary?: string | null;
  lastCallTranscript?: string | null;
  lastCallRecordingUrl?: string | null;
  callAnalysis?: CallAnalysis | null;
  scheduledCallAt?: Timestamp | null;
  callAttempts?: number;
  contactedAt?: Timestamp | null;
}

// Structured data extracted from SMS AI conversations (mirrors CallAnalysis)
export interface SmsAnalysis {
  conversationOutcome?: 'completed' | 'in_progress' | 'unresponsive' | 'opted_out' | string;
  interestLevel?: 'high' | 'very_high' | 'medium' | 'moderate' | 'low' | 'none' | 'not_interested' | string;
  projectType?: string;
  propertyType?: 'personal_home' | 'rental_property' | 'commercial' | string;
  timeline?: string;
  projectDescription?: string;
  additionalNotes?: string;
  confirmedContactInfo?: boolean;
  requestedCallback?: boolean;
  removeFromList?: boolean;
  [key: string]: unknown;
}

export interface LeadSmsData {
  lastSmsAt?: Timestamp | null;
  lastSmsConversationId?: string | null;
  lastSmsOutcome?: 'completed' | 'in_progress' | 'unresponsive' | 'opted_out' | null;
  smsAnalysis?: SmsAnalysis | null;
  scheduledSmsAt?: Timestamp | null;
  smsAttempts?: number;
  smsMessageCount?: number;
}

export interface Lead extends LeadCallData, LeadSmsData {
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
  contactPreference?: ContactPreference;
  autoCallEnabled?: boolean;
  autoSmsEnabled?: boolean;
  // Auto-assignment tracking
  autoAssigned?: boolean;
  autoAssignedAt?: Timestamp | null;
  autoAssignedDistance?: number | null; // miles from sales rep
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

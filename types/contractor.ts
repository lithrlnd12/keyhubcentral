import { Timestamp } from 'firebase/firestore';

export type Trade = 'installer' | 'sales_rep' | 'service_tech' | 'pm';
export type ContractorStatus = 'pending' | 'active' | 'inactive' | 'suspended';

// Standardized specialties — shared between contractors and customers for exact matching
export const SPECIALTIES = [
  'Kitchen Remodel',
  'Bathroom Remodel',
  'Flooring',
  'Painting',
  'Roofing',
  'Siding',
  'Windows & Doors',
  'Plumbing',
  'Electrical',
  'HVAC',
  'Fencing',
  'Concrete & Masonry',
  'Drywall',
  'Framing',
  'Gutters',
  'Insulation',
  'Landscaping',
  'Decks & Patios',
  'General Repair',
  'Demolition',
] as const;

export type Specialty = (typeof SPECIALTIES)[number];

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  lat?: number | null;
  lng?: number | null;
}

export interface License {
  type: string;
  number: string;
  state: string;
  expiration: Timestamp;
}

export interface Insurance {
  carrier: string;
  policyNumber: string;
  expiration: Timestamp;
  certificateUrl: string;
}

export interface ACHInfo {
  bankName: string;
  routingNumber: string;
  accountNumber: string;
}

export interface Rating {
  overall: number;
  customer: number;
  speed: number;
  warranty: number;
  internal: number;
}

export interface Contractor {
  id: string;
  userId?: string;
  email?: string;
  phone?: string;
  businessName: string | null;
  address: Address;
  shippingAddress?: Address;
  shippingSameAsAddress?: boolean;
  trades: Trade[];
  specialties: string[];
  skills: string[];
  licenses: License[];
  insurance: Insurance | null;
  w9Url: string | null;
  achInfo: ACHInfo | null;
  serviceRadius: number; // in miles
  rating: Rating;
  status: ContractorStatus;
  // KeyHub Network — opt-in array of networkIds this contractor is visible in
  sharedNetworks?: string[];
  networkOptOut?: boolean;
  networkOptInDismissedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Rating tier helpers
export type RatingTier = 'elite' | 'pro' | 'standard' | 'needs_improvement' | 'probation';

import { tenant } from '@/lib/config/tenant';

export function getRatingTier(overall: number): RatingTier {
  const t = tenant.ratingThresholds;
  if (overall >= t.elite) return 'elite';
  if (overall >= t.pro) return 'pro';
  if (overall >= t.standard) return 'standard';
  if (overall >= t.needsImprovement) return 'needs_improvement';
  return 'probation';
}

export function getCommissionRate(tier: RatingTier): number {
  const r = tenant.commissionRates;
  switch (tier) {
    case 'elite':
      return r.elite;
    case 'pro':
      return r.pro;
    default:
      return r.standard;
  }
}

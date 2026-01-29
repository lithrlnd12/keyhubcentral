import { Timestamp } from 'firebase/firestore';

export type Trade = 'installer' | 'sales_rep' | 'service_tech' | 'pm';
export type ContractorStatus = 'pending' | 'active' | 'inactive' | 'suspended';

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
  userId: string;
  businessName: string | null;
  address: Address;
  trades: Trade[];
  skills: string[];
  licenses: License[];
  insurance: Insurance | null;
  w9Url: string | null;
  achInfo: ACHInfo | null;
  serviceRadius: number; // in miles
  rating: Rating;
  status: ContractorStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Rating tier helpers
export type RatingTier = 'elite' | 'pro' | 'standard' | 'needs_improvement' | 'probation';

export function getRatingTier(overall: number): RatingTier {
  if (overall >= 4.5) return 'elite';
  if (overall >= 3.5) return 'pro';
  if (overall >= 2.5) return 'standard';
  if (overall >= 1.5) return 'needs_improvement';
  return 'probation';
}

export function getCommissionRate(tier: RatingTier): number {
  switch (tier) {
    case 'elite':
      return 0.1; // 10%
    case 'pro':
      return 0.09; // 9%
    default:
      return 0.08; // 8%
  }
}

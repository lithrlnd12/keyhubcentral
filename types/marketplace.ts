import { Timestamp } from 'firebase/firestore';

export type MarketplaceListingStatus = 'open' | 'claimed' | 'filled' | 'cancelled' | 'expired';

export interface MarketplaceListing {
  id: string;
  dealerId: string;
  dealerName: string;
  title: string;
  description: string;
  jobType: string;
  trade: string;
  location: {
    city: string;
    state: string;
    zip: string;
    lat?: number;
    lng?: number;
  };
  dateNeeded: string; // ISO date
  timeBlock: 'am' | 'pm' | 'evening' | 'full_day';
  estimatedDuration: string; // e.g., "4 hours", "2 days"
  payRate: number;
  payType: 'hourly' | 'flat' | 'per_job';
  requiredSkills: string[];
  crewSize: number;
  status: MarketplaceListingStatus;
  bids: MarketplaceBid[];
  acceptedBidId?: string | null;
  expiresAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MarketplaceBid {
  id: string;
  contractorId: string;
  contractorName: string;
  contractorRating: number;
  contractorTier: string;
  distance: number; // miles from job
  proposedRate: number;
  message: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  bidAt: Timestamp;
}

// Display helpers

export const TIME_BLOCK_LABELS: Record<MarketplaceListing['timeBlock'], string> = {
  am: 'Morning (AM)',
  pm: 'Afternoon (PM)',
  evening: 'Evening',
  full_day: 'Full Day',
};

export const PAY_TYPE_LABELS: Record<MarketplaceListing['payType'], string> = {
  hourly: '/hr',
  flat: ' flat',
  per_job: '/job',
};

export const LISTING_STATUS_LABELS: Record<MarketplaceListingStatus, string> = {
  open: 'Open',
  claimed: 'Claimed',
  filled: 'Filled',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const LISTING_STATUS_VARIANTS: Record<MarketplaceListingStatus, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  open: 'success',
  claimed: 'info',
  filled: 'default',
  cancelled: 'error',
  expired: 'warning',
};

export const TRADE_OPTIONS = [
  { value: 'installer', label: 'Installer' },
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'service_tech', label: 'Service Tech' },
  { value: 'pm', label: 'Project Manager' },
] as const;

export const JOB_TYPE_OPTIONS = [
  { value: 'installation', label: 'Installation' },
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'renovation', label: 'Renovation' },
  { value: 'other', label: 'Other' },
] as const;

export interface MarketplaceFilters {
  trade?: string;
  maxDistance?: number;
  minPay?: number;
  maxPay?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

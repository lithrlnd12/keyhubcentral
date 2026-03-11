import { Timestamp } from 'firebase/firestore';

// White-label tenant configuration stored in Firestore
export interface TenantPortalConfig {
  id: string;
  slug: string; // URL-friendly identifier (e.g., "acme-plumbing")
  companyName: string;
  tagline?: string;

  // Branding
  branding: {
    logoUrl?: string;
    faviconUrl?: string;
    primaryColor: string; // hex color
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };

  // Contact info shown to customers
  contact: {
    email?: string;
    phone?: string;
    website?: string;
    address?: string;
  };

  // Which KeyHub user owns this tenant (the contractor/company)
  ownerId: string;
  ownerEmail: string;

  // Feature toggles
  features: {
    jobTracking: boolean;
    invoices: boolean;
    messaging: boolean;
    documents: boolean;
    photos: boolean;
    scheduling: boolean;
  };

  // Custom domain (future)
  customDomain?: string;

  status: 'active' | 'inactive' | 'trial';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Customer view of a job — sanitized, no internal costs/commissions
export interface CustomerJobView {
  id: string;
  jobNumber: string;
  type: string;
  status: string;
  statusLabel: string;
  statusStep: number; // 0-based index in the progress bar
  totalSteps: number;
  address: string;
  scheduledStart?: string | null;
  targetCompletion?: string | null;
  photosBefore: Array<{ url: string; caption?: string }>;
  photosAfter: Array<{ url: string; caption?: string }>;
  warranty?: {
    status: string;
    endDate?: string | null;
  };
  notes?: string;
  crew?: string[]; // Names only, no IDs
  updatedAt: string;
}

// Customer-facing status labels (friendlier than internal ones)
export const CUSTOMER_STATUS_MAP: Record<string, { label: string; step: number; description: string }> = {
  lead: { label: 'Inquiry Received', step: 0, description: 'We received your project request.' },
  sold: { label: 'Project Confirmed', step: 1, description: 'Your project is confirmed and moving forward.' },
  front_end_hold: { label: 'Preparing', step: 2, description: 'We\'re preparing materials and scheduling.' },
  production: { label: 'In Production', step: 3, description: 'Materials are being prepared for your project.' },
  scheduled: { label: 'Scheduled', step: 4, description: 'Your project has been scheduled.' },
  started: { label: 'In Progress', step: 5, description: 'Work is underway on your project!' },
  complete: { label: 'Completed', step: 6, description: 'Your project is complete.' },
  paid_in_full: { label: 'Closed', step: 7, description: 'Project complete and finalized. Thank you!' },
};

export const CUSTOMER_STATUS_STEPS = [
  'Inquiry', 'Confirmed', 'Preparing', 'Production', 'Scheduled', 'In Progress', 'Complete', 'Closed'
];

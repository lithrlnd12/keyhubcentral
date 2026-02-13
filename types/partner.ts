import { Timestamp } from 'firebase/firestore';
import { Address } from './contractor';

// Partner company status
export type PartnerStatus = 'pending' | 'active' | 'inactive' | 'suspended';

// Partner company information
export interface Partner {
  id: string;
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: Address;
  status: PartnerStatus;
  notes: string | null;
  createdAt: Timestamp;
  approvedAt: Timestamp | null;
  approvedBy: string | null;
  updatedAt: Timestamp;
}

// Labor Request types
export type LaborRequestStatus =
  | 'new'
  | 'reviewed'
  | 'approved'
  | 'assigned'
  | 'in_progress'
  | 'complete'
  | 'cancelled';

export type WorkType =
  | 'installation'
  | 'repair'
  | 'maintenance'
  | 'inspection'
  | 'other';

export interface StatusChange {
  status: LaborRequestStatus;
  changedAt: Timestamp;
  changedBy: string;
  notes: string | null;
}

export interface LaborRequest {
  id: string;
  requestNumber: string; // e.g., LR-2026-0001

  // Partner info
  partnerId: string;
  partnerCompany: string;
  submittedBy: string; // userId

  // Request details
  workType: WorkType;
  description: string;
  location: Address;
  dateNeeded: Timestamp;
  estimatedDuration: string; // e.g., "2-3 days"
  crewSize: number;
  skillsRequired: string[];
  specialEquipment: string | null;
  notes: string | null;

  // Assignment (hidden from partner)
  assignedContractorIds: string[];

  // Attachments
  photos?: string[];
  workOrderUrl?: string | null;

  // Status tracking
  status: LaborRequestStatus;
  statusHistory: StatusChange[];

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  reviewedAt: Timestamp | null;
  reviewedBy: string | null;
  completedAt: Timestamp | null;
}

// Partner Service Ticket types
export type PartnerTicketStatus =
  | 'new'
  | 'reviewed'
  | 'assigned'
  | 'scheduled'
  | 'in_progress'
  | 'complete';

export type IssueType = 'warranty' | 'repair' | 'callback' | 'other';

export type Urgency = 'low' | 'medium' | 'high' | 'emergency';

export interface PartnerStatusChange {
  status: PartnerTicketStatus;
  changedAt: Timestamp;
  changedBy: string;
  notes: string | null;
}

export interface PartnerServiceTicket {
  id: string;
  ticketNumber: string; // e.g., PST-2026-0001

  // Partner info
  partnerId: string;
  partnerCompany: string;
  submittedBy: string;

  // Ticket details
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  serviceAddress: Address;
  issueType: IssueType;
  issueDescription: string;
  productInfo: string | null; // e.g., "Model XYZ, installed 2024-03-15"
  photos: string[]; // URLs to uploaded photos
  urgency: Urgency;
  preferredDate: Timestamp | null;

  // Assignment (hidden from partner)
  assignedTechId: string | null;
  scheduledDate: Timestamp | null;

  // Work order fields (from SWO PDF upload)
  serviceOrderNumber?: string | null;
  caseNumber?: string | null;
  estimatedCost?: number | null;
  workOrderUrl?: string | null;

  // Resolution
  status: PartnerTicketStatus;
  statusHistory: PartnerStatusChange[];
  resolution: string | null;

  // Timestamps
  createdAt: Timestamp;
  updatedAt: Timestamp;
  resolvedAt: Timestamp | null;
}

// Status flow helpers
export const LABOR_REQUEST_STATUS_ORDER: LaborRequestStatus[] = [
  'new',
  'reviewed',
  'approved',
  'assigned',
  'in_progress',
  'complete',
];

export const PARTNER_TICKET_STATUS_ORDER: PartnerTicketStatus[] = [
  'new',
  'reviewed',
  'assigned',
  'scheduled',
  'in_progress',
  'complete',
];

// Work type options for forms
export const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = [
  { value: 'installation', label: 'Installation' },
  { value: 'repair', label: 'Repair' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' },
];

export const ISSUE_TYPE_OPTIONS: { value: IssueType; label: string }[] = [
  { value: 'warranty', label: 'Warranty' },
  { value: 'repair', label: 'Repair' },
  { value: 'callback', label: 'Callback' },
  { value: 'other', label: 'Other' },
];

export const URGENCY_OPTIONS: { value: Urgency; label: string; description: string }[] = [
  { value: 'low', label: 'Low', description: 'Within 2 weeks' },
  { value: 'medium', label: 'Medium', description: 'Within 1 week' },
  { value: 'high', label: 'High', description: 'Within 48 hours' },
  { value: 'emergency', label: 'Emergency', description: 'ASAP' },
];

// Status display helpers
export function getLaborRequestStatusLabel(status: LaborRequestStatus): string {
  const labels: Record<LaborRequestStatus, string> = {
    new: 'New',
    reviewed: 'Under Review',
    approved: 'Approved',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    complete: 'Complete',
    cancelled: 'Cancelled',
  };
  return labels[status];
}

export function getPartnerTicketStatusLabel(status: PartnerTicketStatus): string {
  const labels: Record<PartnerTicketStatus, string> = {
    new: 'New',
    reviewed: 'Under Review',
    assigned: 'Assigned',
    scheduled: 'Scheduled',
    in_progress: 'In Progress',
    complete: 'Complete',
  };
  return labels[status];
}

// Get next status in the flow
export function getNextLaborRequestStatus(current: LaborRequestStatus): LaborRequestStatus | null {
  if (current === 'cancelled') return null;
  const index = LABOR_REQUEST_STATUS_ORDER.indexOf(current);
  if (index === -1 || index === LABOR_REQUEST_STATUS_ORDER.length - 1) return null;
  return LABOR_REQUEST_STATUS_ORDER[index + 1];
}

export function getNextPartnerTicketStatus(current: PartnerTicketStatus): PartnerTicketStatus | null {
  const index = PARTNER_TICKET_STATUS_ORDER.indexOf(current);
  if (index === -1 || index === PARTNER_TICKET_STATUS_ORDER.length - 1) return null;
  return PARTNER_TICKET_STATUS_ORDER[index + 1];
}

// Filter interfaces
export interface LaborRequestFilters {
  partnerId?: string;
  status?: LaborRequestStatus;
  workType?: WorkType;
  search?: string;
}

export interface PartnerTicketFilters {
  partnerId?: string;
  status?: PartnerTicketStatus;
  urgency?: Urgency;
  assignedTechId?: string;
  search?: string;
}

export interface PartnerFilters {
  status?: PartnerStatus;
  search?: string;
}

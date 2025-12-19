import { Timestamp } from 'firebase/firestore';
import { Address } from './contractor';

export type JobType = 'bathroom' | 'kitchen' | 'exterior' | 'other';

export type JobStatus =
  | 'lead'
  | 'sold'
  | 'front_end_hold'
  | 'production'
  | 'scheduled'
  | 'started'
  | 'complete'
  | 'paid_in_full';

export interface Customer {
  name: string;
  phone: string;
  email: string;
  address: Address;
}

export interface JobCosts {
  materialProjected: number;
  materialActual: number;
  laborProjected: number;
  laborActual: number;
}

export interface JobDates {
  created: Timestamp;
  sold: Timestamp | null;
  scheduledStart: Timestamp | null;
  actualStart: Timestamp | null;
  targetCompletion: Timestamp | null;
  actualCompletion: Timestamp | null;
  paidInFull: Timestamp | null;
}

export interface Warranty {
  startDate: Timestamp | null;
  endDate: Timestamp | null;
  status: 'active' | 'expired' | 'pending';
}

export interface Job {
  id: string;
  jobNumber: string;
  customer: Customer;
  type: JobType;
  status: JobStatus;
  salesRepId: string | null;
  crewIds: string[];
  pmId: string | null;
  costs: JobCosts;
  dates: JobDates;
  warranty: Warranty;
  notes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CommunicationType = 'call' | 'email' | 'text' | 'note' | 'status_update';

export interface JobCommunication {
  id: string;
  jobId: string;
  type: CommunicationType;
  userId: string;
  content: string;
  attachments: string[];
  createdAt: Timestamp;
}

export type ServiceTicketStatus = 'new' | 'assigned' | 'scheduled' | 'in_progress' | 'complete';

export interface ServiceTicket {
  id: string;
  ticketNumber: string;
  jobId: string;
  customer: Customer;
  issue: string;
  photosBefore: string[];
  photosAfter: string[];
  assignedTechId: string | null;
  status: ServiceTicketStatus;
  resolution: string | null;
  createdAt: Timestamp;
  resolvedAt: Timestamp | null;
}

// Job status flow helpers
export const JOB_STATUS_ORDER: JobStatus[] = [
  'lead',
  'sold',
  'front_end_hold',
  'production',
  'scheduled',
  'started',
  'complete',
  'paid_in_full',
];

export function getNextStatus(current: JobStatus): JobStatus | null {
  const index = JOB_STATUS_ORDER.indexOf(current);
  if (index === -1 || index === JOB_STATUS_ORDER.length - 1) return null;
  return JOB_STATUS_ORDER[index + 1];
}

export function canTransitionStatus(current: JobStatus, next: JobStatus): boolean {
  const currentIndex = JOB_STATUS_ORDER.indexOf(current);
  const nextIndex = JOB_STATUS_ORDER.indexOf(next);
  return nextIndex === currentIndex + 1;
}

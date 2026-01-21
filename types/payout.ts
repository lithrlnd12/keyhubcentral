import { Timestamp } from 'firebase/firestore';

export type PayoutType = 'lead_fee' | 'labor';

export type PayoutFromEntity = 'kr';

export type PayoutToEntity = 'kts' | 'kd';

export type PayoutStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Payout {
  id: string;
  jobId: string;
  jobNumber: string;
  type: PayoutType;
  fromEntity: PayoutFromEntity;
  toEntity: PayoutToEntity;
  amount: number;
  invoiceId: string;
  status: PayoutStatus;
  // Additional context
  contractorId?: string | null;      // For labor payouts
  contractorName?: string | null;
  leadId?: string | null;            // For lead fee payouts
  leadSource?: string | null;
  // Timestamps
  createdAt: Timestamp;
  processedAt?: Timestamp | null;
  failedAt?: Timestamp | null;
  failureReason?: string | null;
  // Audit
  processedBy?: string | null;
  notes?: string;
}

export interface PayoutSummary {
  totalPending: number;
  totalProcessing: number;
  totalCompleted: number;
  totalFailed: number;
  pendingAmount: number;
  completedAmount: number;
}

export interface PayoutFilters {
  status?: PayoutStatus;
  type?: PayoutType;
  toEntity?: PayoutToEntity;
  jobId?: string;
  contractorId?: string;
  startDate?: Date;
  endDate?: Date;
}

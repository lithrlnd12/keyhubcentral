import { Timestamp } from 'firebase/firestore';

export type InboundCallStatus = 'new' | 'reviewed' | 'contacted' | 'converted' | 'closed';
export type ClosedReason = 'spam' | 'wrong_number' | 'not_interested' | 'other';

export type PrimaryConcern = 'price' | 'timeline' | 'warranty' | 'trust';
export type Urgency = 'exploring' | 'ready' | 'urgent';
export type EmotionalSignal = 'frustrated' | 'excited' | 'skeptical' | 'neutral';

export interface InboundCallCaller {
  phone: string;
  name: string | null;
}

export interface InboundCallAnalysis {
  projectType: string | null;
  primaryConcern: PrimaryConcern | null;
  urgency: Urgency | null;
  emotionalSignal: EmotionalSignal | null;
  timeline: string | null;
  notes: string | null;
}

export interface InboundCall {
  id: string;
  vapiCallId: string;
  caller: InboundCallCaller;
  analysis: InboundCallAnalysis;
  duration: number;
  recordingUrl: string | null;
  transcript: string | null;
  summary: string | null;
  status: InboundCallStatus;
  closedReason: ClosedReason | null;
  linkedLeadId: string | null;
  reviewedBy: string | null;
  reviewedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Helper type for creating new inbound calls (without id and timestamps)
export type CreateInboundCallData = Omit<InboundCall, 'id' | 'createdAt' | 'updatedAt' | 'reviewedAt'> & {
  reviewedAt?: null;
};

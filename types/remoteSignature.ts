import { Timestamp } from 'firebase/firestore';

export type RemoteSigningStatus = 'pending' | 'viewed' | 'signed' | 'expired' | 'cancelled';

export interface RemoteSigningSession {
  id: string;
  contractId: string;
  jobId: string;
  token: string;
  recipientEmail: string;
  recipientName: string;
  sentBy: string;
  status: RemoteSigningStatus;
  expiresAt: Timestamp;
  viewedAt?: Timestamp | null;
  signedAt?: Timestamp | null;
  signatureUrl?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

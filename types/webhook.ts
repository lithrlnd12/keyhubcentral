import { Timestamp } from 'firebase/firestore';

export type WebhookEvent =
  | 'job.created'
  | 'job.status_changed'
  | 'lead.created'
  | 'lead.assigned'
  | 'lead.converted'
  | 'invoice.created'
  | 'invoice.paid'
  | 'appointment.scheduled'
  | 'contractor.status_changed';

export interface WebhookEndpoint {
  id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  secret: string; // HMAC-SHA256 signing secret
  active: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: WebhookEvent;
  payload: Record<string, unknown>;
  status: 'success' | 'failed' | 'pending';
  responseCode?: number;
  responseBody?: string;
  attemptCount: number;
  lastAttemptAt: Timestamp;
  createdAt: Timestamp;
}

export interface ApiKey {
  id: string;
  name: string;
  keyHash: string; // SHA-256 hash of the key (never store plaintext)
  keyPrefix: string; // First 8 chars for display (e.g., "khc_abc1...")
  permissions: string[];
  createdBy: string;
  lastUsedAt?: Timestamp | null;
  createdAt: Timestamp;
}

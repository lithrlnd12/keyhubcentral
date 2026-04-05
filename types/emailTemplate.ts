import { Timestamp } from 'firebase/firestore';

export type EmailTriggerEvent =
  | 'lead.created'
  | 'lead.assigned'
  | 'lead.converted'
  | 'job.status_changed'
  | 'job.completed'
  | 'appointment.scheduled'
  | 'appointment.reminder'
  | 'invoice.created'
  | 'invoice.overdue'
  | 'review.request';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string; // HTML with {{variable}} placeholders
  trigger?: EmailTriggerEvent;
  triggerConditions?: Record<string, string>; // e.g., { "job.status": "complete" }
  delayMinutes?: number; // delay after trigger before sending
  enabled: boolean;
  createdBy: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface QueuedEmail {
  id: string;
  templateId: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  bodyHtml: string; // Rendered HTML (variables replaced)
  status: 'pending' | 'sent' | 'failed';
  scheduledFor: Timestamp;
  sentAt?: Timestamp | null;
  error?: string | null;
  metadata?: Record<string, string>; // jobId, leadId, etc.
  createdAt: Timestamp;
}

export interface TemplateVariable {
  key: string; // e.g., "customer.name"
  label: string; // e.g., "Customer Name"
  category: string; // e.g., "Customer", "Job", "Company"
}

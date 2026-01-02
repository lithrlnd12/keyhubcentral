import { Timestamp } from 'firebase/firestore';
import { SmsAnalysis } from '@/types/lead';

export type SmsConversationStatus = 'pending' | 'active' | 'completed' | 'unresponsive' | 'opted_out';

export interface SmsMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Timestamp;
  messageSid?: string; // Twilio message SID
  status?: 'queued' | 'sent' | 'delivered' | 'failed' | 'received';
}

export interface SmsConversation {
  id: string;
  leadId: string;
  phoneNumber: string;
  customerName: string;
  status: SmsConversationStatus;
  messages: SmsMessage[];
  messageCount: number;
  analysis?: SmsAnalysis | null;
  startedAt: Timestamp;
  lastMessageAt: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Twilio webhook payload structure
export interface TwilioWebhookPayload {
  MessageSid: string;
  AccountSid: string;
  From: string;
  To: string;
  Body: string;
  NumMedia: string;
  NumSegments: string;
  SmsStatus?: string;
  ApiVersion?: string;
}

// SMS send result
export interface SmsSendResult {
  success: boolean;
  messageSid?: string;
  error?: string;
  provider: 'textbelt' | 'twilio';
}

// Textbelt response
export interface TextbeltResponse {
  success: boolean;
  textId?: string;
  quotaRemaining?: number;
  error?: string;
}

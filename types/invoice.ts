import { Timestamp } from 'firebase/firestore';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';

export interface InvoiceEntity {
  entity: 'kd' | 'kts' | 'kr' | 'customer' | 'subscriber';
  name: string;
  email?: string;
}

export interface LineItem {
  description: string;
  qty: number;
  rate: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  from: InvoiceEntity;
  to: InvoiceEntity;
  lineItems: LineItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: InvoiceStatus;
  dueDate: Timestamp;
  sentAt: Timestamp | null;
  paidAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Invoice type helpers
export type InvoiceType =
  | 'kd_to_kr' // Lead fees
  | 'kts_to_kr' // Labor + commissions
  | 'kr_to_customer' // Job payments
  | 'kd_to_subscriber'; // Subscription + ad spend

export function getInvoiceTypeLabel(type: InvoiceType): string {
  switch (type) {
    case 'kd_to_kr':
      return 'Lead Fee';
    case 'kts_to_kr':
      return 'Labor & Commission';
    case 'kr_to_customer':
      return 'Customer Invoice';
    case 'kd_to_subscriber':
      return 'Subscription';
  }
}

// Internal discount rate
export const INTERNAL_DISCOUNT_RATE = 0.2; // 20% off market rates
export const NET_TERMS_DAYS = 30;

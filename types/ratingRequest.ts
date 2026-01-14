import { Timestamp } from 'firebase/firestore';

export type RatingRequestStatus = 'pending' | 'completed' | 'expired';

export interface RatingRequest {
  id: string;
  jobId: string;
  jobNumber: string;
  contractorId: string;
  contractorName: string;
  customerEmail: string;
  customerName: string;
  token: string; // Secure random token (32 chars) for public access
  status: RatingRequestStatus;
  sentAt: Timestamp;
  reminderSentAt?: Timestamp;
  completedAt?: Timestamp;
  rating?: number; // 1-5 stars
  comment?: string;
  expiresAt: Timestamp; // 30 days from creation
  createdAt: Timestamp;
}

// Input for creating a new rating request
export interface CreateRatingRequestInput {
  jobId: string;
  jobNumber: string;
  contractorId: string;
  contractorName: string;
  customerEmail: string;
  customerName: string;
}

// Input for submitting a rating
export interface SubmitRatingInput {
  rating: number; // 1-5
  comment?: string;
}

// Rating request with computed fields for display
export interface RatingRequestWithMeta extends RatingRequest {
  isExpired: boolean;
  daysUntilExpiry: number;
}

// Check if a rating request is expired
export function isRatingRequestExpired(request: RatingRequest): boolean {
  if (request.status === 'expired') return true;
  if (request.status === 'completed') return false;

  const now = new Date();
  const expiresAt = request.expiresAt.toDate();
  return now > expiresAt;
}

// Calculate days until expiry
export function getDaysUntilExpiry(request: RatingRequest): number {
  if (request.status !== 'pending') return 0;

  const now = new Date();
  const expiresAt = request.expiresAt.toDate();
  const diffTime = expiresAt.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Expiry duration in days
export const RATING_REQUEST_EXPIRY_DAYS = 30;

// Generate a secure random token
export function generateRatingToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

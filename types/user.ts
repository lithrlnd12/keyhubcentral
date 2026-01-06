import { Timestamp } from 'firebase/firestore';

export type UserRole =
  | 'owner'
  | 'admin'
  | 'sales_rep'
  | 'contractor'
  | 'pm'
  | 'subscriber'
  | 'partner'
  | 'pending';

export type UserStatus = 'pending' | 'active' | 'inactive' | 'suspended';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  partnerId?: string | null; // For partner role users - links to partner company
  createdAt: Timestamp;
  approvedAt: Timestamp | null;
  approvedBy: string | null;
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string, phone?: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

// Permission helpers
export const ADMIN_ROLES: UserRole[] = ['owner', 'admin'];
export const INTERNAL_ROLES: UserRole[] = ['owner', 'admin', 'sales_rep', 'contractor', 'pm'];
export const EXTERNAL_ROLES: UserRole[] = ['subscriber', 'partner'];

export function canAccessDashboard(role: UserRole): boolean {
  return INTERNAL_ROLES.includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function canViewAllJobs(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function canViewAllContractors(role: UserRole): boolean {
  return ['owner', 'admin', 'pm'].includes(role);
}

export function canViewFinancials(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function canManageCampaigns(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isPartner(role: UserRole): boolean {
  return role === 'partner';
}

export function canManagePartnerRequests(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

// Inventory permissions
export function canManageInventory(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function canViewInventory(role: UserRole): boolean {
  return ['owner', 'admin', 'pm', 'contractor'].includes(role);
}

export function canCountInventory(role: UserRole): boolean {
  return ['owner', 'admin', 'pm', 'contractor'].includes(role);
}

export function canUploadReceipts(role: UserRole): boolean {
  return ['owner', 'admin', 'pm', 'contractor'].includes(role);
}

export function canVerifyReceipts(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function canAddReceiptsToPL(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

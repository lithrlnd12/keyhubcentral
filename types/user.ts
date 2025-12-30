import { Timestamp } from 'firebase/firestore';

export type UserRole =
  | 'owner'
  | 'admin'
  | 'sales_rep'
  | 'contractor'
  | 'pm'
  | 'subscriber'
  | 'pending';

export type UserStatus = 'pending' | 'active' | 'inactive' | 'suspended';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
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

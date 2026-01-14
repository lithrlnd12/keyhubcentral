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
  requestedRole?: UserRole | null; // Role user selected during signup
  baseZipCode?: string | null; // For sales_rep: their home base zip code
  baseCoordinates?: { // Geocoded coordinates from zip code
    lat: number;
    lng: number;
  } | null;
  createdAt: Timestamp;
  approvedAt: Timestamp | null;
  approvedBy: string | null;
}

export interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    displayName: string,
    phone?: string,
    requestedRole?: UserRole,
    baseZipCode?: string
  ) => Promise<void>;
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

// Contractor-specific permissions
export function isContractor(role: UserRole): boolean {
  return role === 'contractor';
}

export function canCreateContractorInvoice(role: UserRole): boolean {
  return role === 'contractor';
}

export function canViewOwnFinancials(role: UserRole): boolean {
  return ['contractor', 'sales_rep'].includes(role);
}

// Job crew assignment permissions
export function canAssignCrew(role: UserRole): boolean {
  return ['owner', 'admin', 'pm', 'sales_rep'].includes(role);
}

export function canScheduleJobs(role: UserRole): boolean {
  return ['owner', 'admin', 'pm', 'sales_rep'].includes(role);
}

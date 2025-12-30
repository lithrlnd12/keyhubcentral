import { NextRequest } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthResult {
  authenticated: boolean;
  user?: DecodedIdToken;
  role?: string;
  error?: string;
}

/**
 * Verify Firebase ID token from Authorization header
 * Returns user info if valid, error if not
 */
export async function verifyFirebaseAuth(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return { authenticated: false, error: 'Missing or invalid Authorization header' };
    }

    const token = authHeader.substring(7);
    const auth = getAdminAuth();

    // Verify the token
    const decodedToken = await auth.verifyIdToken(token);

    // Get user role from Firestore
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();

    return {
      authenticated: true,
      user: decodedToken,
      role: userData?.role || 'pending',
    };
  } catch (error) {
    console.error('Auth verification error:', error);
    return {
      authenticated: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
    };
  }
}

/**
 * Check if user has required role
 */
export function hasRole(role: string | undefined, allowedRoles: string[]): boolean {
  return !!role && allowedRoles.includes(role);
}

/**
 * Check if user is admin (owner or admin)
 */
export function isAdmin(role: string | undefined): boolean {
  return hasRole(role, ['owner', 'admin']);
}

/**
 * Check if user is internal (owner, admin, sales_rep, contractor, pm)
 */
export function isInternal(role: string | undefined): boolean {
  return hasRole(role, ['owner', 'admin', 'sales_rep', 'contractor', 'pm']);
}

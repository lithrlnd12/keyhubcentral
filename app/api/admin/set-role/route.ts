import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { verifyFirebaseAuth, isAdmin } from '@/lib/auth/verifyRequest';

// POST - Set user role as custom claim (for Storage rules)
export async function POST(request: NextRequest) {
  try {
    // Verify caller's identity from their Firebase ID token
    const auth = await verifyFirebaseAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid or missing authentication token' },
        { status: 401 }
      );
    }

    // Verify the caller is an admin or owner
    if (!isAdmin(auth.role)) {
      return NextResponse.json(
        { error: 'Forbidden: Only admins can set user roles' },
        { status: 403 }
      );
    }

    const { uid, role, partnerId } = await request.json();

    if (!uid || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, role' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const adminAuth = getAdminAuth();

    // Validate role
    const validRoles = ['owner', 'admin', 'sales_rep', 'contractor', 'pm', 'subscriber', 'partner', 'pending'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Only owners can promote to owner or admin
    if (['owner', 'admin'].includes(role) && auth.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden: Only owners can assign owner or admin roles' },
        { status: 403 }
      );
    }

    // Validate partnerId is provided for partner role
    if (role === 'partner' && !partnerId) {
      return NextResponse.json(
        { error: 'partnerId is required for partner role' },
        { status: 400 }
      );
    }

    // Set custom claims on the user's auth token
    await adminAuth.setCustomUserClaims(uid, {
      role,
      isAdmin: ['owner', 'admin'].includes(role),
      isInternal: ['owner', 'admin', 'sales_rep', 'contractor', 'pm'].includes(role),
      isPartner: role === 'partner',
      partnerId: role === 'partner' ? partnerId : null,
    });

    // Revoke refresh tokens to force re-authentication with new claims
    await adminAuth.revokeRefreshTokens(uid);

    console.log(`Custom claims set for user ${uid}: role=${role} by ${auth.user.uid}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return NextResponse.json(
      { error: 'Failed to set user role' },
      { status: 500 }
    );
  }
}

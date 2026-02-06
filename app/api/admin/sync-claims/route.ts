import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';
import { verifyFirebaseAuth } from '@/lib/auth/verifyRequest';

// POST - Sync all users' roles to custom claims (one-time migration)
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

    // Only owners can sync claims
    if (auth.role !== 'owner') {
      return NextResponse.json(
        { error: 'Forbidden: Only owners can sync claims' },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    const adminAuth = getAdminAuth();

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const results: { uid: string; role: string; success: boolean; error?: string }[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;
      const role = userData.role || 'pending';

      try {
        await adminAuth.setCustomUserClaims(uid, {
          role,
          isAdmin: ['owner', 'admin'].includes(role),
          isInternal: ['owner', 'admin', 'sales_rep', 'contractor', 'pm'].includes(role),
          isPartner: role === 'partner',
          partnerId: role === 'partner' ? (userData.partnerId || null) : null,
        });
        results.push({ uid, role, success: true });
      } catch (error) {
        results.push({
          uid,
          role,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`Custom claims synced by ${auth.user.uid}: ${successful} successful, ${failed} failed`);

    return NextResponse.json({
      success: true,
      synced: successful,
      failed,
      results
    });
  } catch (error) {
    console.error('Error syncing custom claims:', error);
    return NextResponse.json(
      { error: 'Failed to sync custom claims' },
      { status: 500 }
    );
  }
}

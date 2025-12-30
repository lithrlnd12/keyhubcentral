import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

// POST - Sync all users' roles to custom claims (one-time migration)
export async function POST(request: NextRequest) {
  try {
    const { callerUid } = await request.json();

    if (!callerUid) {
      return NextResponse.json(
        { error: 'Missing callerUid' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

    // Verify the caller is an owner
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData || callerData.role !== 'owner') {
      return NextResponse.json(
        { error: 'Unauthorized: Only owners can sync claims' },
        { status: 403 }
      );
    }

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const results: { uid: string; role: string; success: boolean; error?: string }[] = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const uid = userDoc.id;
      const role = userData.role || 'pending';

      try {
        await auth.setCustomUserClaims(uid, {
          role,
          isAdmin: ['owner', 'admin'].includes(role),
          isInternal: ['owner', 'admin', 'sales_rep', 'contractor', 'pm'].includes(role),
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

    console.log(`Custom claims synced: ${successful} successful, ${failed} failed`);

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

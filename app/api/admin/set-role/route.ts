import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

// POST - Set user role as custom claim (for Storage rules)
export async function POST(request: NextRequest) {
  try {
    const { uid, role, callerUid } = await request.json();

    if (!uid || !role || !callerUid) {
      return NextResponse.json(
        { error: 'Missing required fields: uid, role, callerUid' },
        { status: 400 }
      );
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

    // Verify the caller is an admin or owner
    const callerDoc = await db.collection('users').doc(callerUid).get();
    const callerData = callerDoc.data();

    if (!callerData || !['owner', 'admin'].includes(callerData.role)) {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can set user roles' },
        { status: 403 }
      );
    }

    // Validate role
    const validRoles = ['owner', 'admin', 'sales_rep', 'contractor', 'pm', 'subscriber', 'pending'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Set custom claims on the user's auth token
    await auth.setCustomUserClaims(uid, {
      role,
      isAdmin: ['owner', 'admin'].includes(role),
      isInternal: ['owner', 'admin', 'sales_rep', 'contractor', 'pm'].includes(role),
    });

    console.log(`Custom claims set for user ${uid}: role=${role}`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting custom claims:', error);
    return NextResponse.json(
      { error: 'Failed to set user role' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyFirebaseAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasRole(auth.role, ['partner', 'owner', 'admin'])) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection('contractors')
      .where('status', '==', 'active')
      .get();

    const contractors = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const lat = data.serviceArea?.center?.lat;
        const lng = data.serviceArea?.center?.lng;
        if (lat == null || lng == null) return null;
        return {
          id: doc.id,
          businessName: data.businessName || null,
          trades: data.trades || [],
          lat,
          lng,
          city: data.city || '',
          state: data.state || '',
        };
      })
      .filter(Boolean);

    return NextResponse.json({ contractors });
  } catch (error) {
    console.error('Error fetching contractor map data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

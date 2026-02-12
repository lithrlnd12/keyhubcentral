import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const snapshot = await adminDb
      .collection('partners')
      .where('status', '==', 'active')
      .orderBy('companyName')
      .get();

    const partners = snapshot.docs.map((doc) => ({
      id: doc.id,
      companyName: doc.data().companyName,
    }));

    return NextResponse.json({ partners });
  } catch (error) {
    console.error('Error fetching public partners:', error);
    return NextResponse.json({ partners: [] }, { status: 500 });
  }
}

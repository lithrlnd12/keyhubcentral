import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || '2026-03';

  try {
    const db = getAdminDb();

    const userId = 'XLo7UYIddZMXeAVgQauT0RFonXR2';
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const contractorId = userData?.contractorId || userId;

    // Direct subcollection query (doesn't need collection group index)
    const directSnap = await db
      .collection('contractors')
      .doc(contractorId)
      .collection('appointments')
      .get();

    const directAppts = directSnap.docs.map(doc => ({
      id: doc.id,
      path: doc.ref.path,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    // Also check the other contractor ID
    const altSnap = await db
      .collection('contractors')
      .doc('ZkJs8yad4EWD1zkjLQeM')
      .collection('appointments')
      .get();

    const altAppts = altSnap.docs.map(doc => ({
      id: doc.id,
      path: doc.ref.path,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
    }));

    // Try collection group query
    let collGroupResults: unknown[] = [];
    let collGroupError: string | null = null;
    try {
      const cgSnap = await db.collectionGroup('appointments')
        .where('date', '>=', `${month}-01`)
        .where('date', '<=', `${month}-31`)
        .get();
      collGroupResults = cgSnap.docs.map(doc => ({
        id: doc.id,
        path: doc.ref.path,
        date: doc.data().date,
        timeBlock: doc.data().timeBlock,
        customerName: doc.data().customerName,
      }));
    } catch (err) {
      collGroupError = (err as Error).message;
    }

    return NextResponse.json({
      userRole: userData?.role,
      userContractorId: contractorId,
      userDisplayName: userData?.displayName,
      directPath: `contractors/${contractorId}/appointments`,
      directCount: directAppts.length,
      directAppointments: directAppts,
      altPath: 'contractors/ZkJs8yad4EWD1zkjLQeM/appointments',
      altCount: altAppts.length,
      altAppointments: altAppts,
      collectionGroupCount: collGroupResults.length,
      collectionGroupResults: collGroupResults,
      collectionGroupError: collGroupError,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || '2026-03';

  const db = getAdminDb();

  const startKey = `${month}-01`;
  const endKey = `${month}-31`;

  // Collection group query — same as admin calendar uses
  const snap = await db.collectionGroup('appointments')
    .where('date', '>=', startKey)
    .where('date', '<=', endKey)
    .get();

  const appointments = snap.docs.map(doc => ({
    id: doc.id,
    path: doc.ref.path,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
    updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString() || null,
  }));

  // Also check specific user
  const userId = 'XLo7UYIddZMXeAVgQauT0RFonXR2';
  const userDoc = await db.collection('users').doc(userId).get();
  const contractorId = userDoc.data()?.contractorId || userId;

  // Check under both possible contractor paths
  const directSnap = await db.collection('contractors').doc(contractorId).collection('appointments').get();
  const altSnap = await db.collection('contractors').doc('ZkJs8yad4EWD1zkjLQeM').collection('appointments').get();

  return NextResponse.json({
    collectionGroupResults: appointments.length,
    appointments,
    userContractorId: contractorId,
    directPathCount: directSnap.size,
    directPath: `contractors/${contractorId}/appointments`,
    altPathCount: altSnap.size,
    altPath: 'contractors/ZkJs8yad4EWD1zkjLQeM/appointments',
  });
}

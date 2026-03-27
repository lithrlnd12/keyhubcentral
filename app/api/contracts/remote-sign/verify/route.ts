import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection('remoteSigningSessions')
      .where('token', '==', token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ error: 'Invalid signing link' }, { status: 404 });
    }

    const sessionDoc = snapshot.docs[0];
    const session = sessionDoc.data();

    // Check if cancelled
    if (session.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This signing session has been cancelled' },
        { status: 410 }
      );
    }

    // Check if already signed
    if (session.status === 'signed') {
      return NextResponse.json(
        { error: 'This contract has already been signed' },
        { status: 410 }
      );
    }

    // Check if expired
    const expiresAt = session.expiresAt.toDate();
    if (expiresAt <= new Date()) {
      return NextResponse.json(
        { error: 'This signing link has expired' },
        { status: 410 }
      );
    }

    // Mark as viewed on first access
    if (session.status === 'pending') {
      const { Timestamp } = await import('firebase-admin/firestore');
      await sessionDoc.ref.update({
        status: 'viewed',
        viewedAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }

    return NextResponse.json({
      contractId: session.contractId,
      jobId: session.jobId,
      recipientName: session.recipientName,
      status: session.status === 'pending' ? 'viewed' : session.status,
    });
  } catch (error) {
    console.error('Error verifying signing token:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to verify token' },
      { status: 500 }
    );
  }
}

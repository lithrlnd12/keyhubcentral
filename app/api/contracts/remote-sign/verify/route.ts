import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

// Simple in-memory rate limiter for token verification (per IP)
const verifyAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS_PER_MINUTE = 5;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = verifyAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    verifyAttempts.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }

  if (entry.count >= MAX_ATTEMPTS_PER_MINUTE) {
    return false;
  }

  entry.count++;
  return true;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per IP per minute
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

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

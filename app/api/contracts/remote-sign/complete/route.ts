import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { token, signatureDataUrl, consentTimestamp } = await request.json();

    if (!token || !signatureDataUrl || !consentTimestamp) {
      return NextResponse.json(
        { error: 'token, signatureDataUrl, and consentTimestamp are required' },
        { status: 400 }
      );
    }

    // Look up session by token
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

    // Validate session state
    if (session.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This signing session has been cancelled' },
        { status: 410 }
      );
    }

    if (session.status === 'signed') {
      return NextResponse.json(
        { error: 'This contract has already been signed' },
        { status: 410 }
      );
    }

    const expiresAt = session.expiresAt.toDate();
    if (expiresAt <= new Date()) {
      return NextResponse.json(
        { error: 'This signing link has expired' },
        { status: 410 }
      );
    }

    if (!['pending', 'viewed'].includes(session.status)) {
      return NextResponse.json(
        { error: 'Invalid session state for signing' },
        { status: 400 }
      );
    }

    // Upload signature image to Firebase Storage
    const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate file content: check PNG magic bytes
    const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (buffer.length < 8 || !buffer.subarray(0, 8).equals(PNG_MAGIC)) {
      return NextResponse.json(
        { error: 'Invalid signature image. Only PNG format is accepted.' },
        { status: 400 }
      );
    }

    // Enforce max size (500KB) to prevent abuse
    const MAX_SIGNATURE_SIZE = 500 * 1024;
    if (buffer.length > MAX_SIGNATURE_SIZE) {
      return NextResponse.json(
        { error: 'Signature image too large. Maximum 500KB.' },
        { status: 400 }
      );
    }

    const storagePath = `contracts/${session.contractId}/remote-signatures/${sessionDoc.id}.png`;
    const bucket = getStorage().bucket();
    const file = bucket.file(storagePath);

    await file.save(buffer, {
      metadata: {
        contentType: 'image/png',
      },
    });

    // Generate a signed URL (expires in 7 days) instead of making file permanently public
    const [signatureUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Capture IP and user agent
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      null;
    const userAgent = request.headers.get('user-agent') || null;

    // Complete the signing session
    await sessionDoc.ref.update({
      status: 'signed',
      signedAt: Timestamp.now(),
      signatureUrl,
      ipAddress,
      userAgent,
      updatedAt: Timestamp.now(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error completing remote signing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete signing' },
      { status: 500 }
    );
  }
}

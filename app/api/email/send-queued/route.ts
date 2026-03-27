import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { tenant } from '@/lib/config/tenant';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { env } from '@/lib/env';

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const CRON_SECRET = process.env.CRON_SECRET;

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

// Initialize Firebase for server-side usage
function getDb() {
  const firebaseConfig = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  return getFirestore(app);
}

export async function POST(request: NextRequest) {
  try {
    // Auth: accept CRON_SECRET bearer token OR verify it's an admin call
    const authHeader = request.headers.get('authorization');

    if (!CRON_SECRET) {
      console.error('CRON_SECRET not configured - rejecting request');
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Email not configured' },
        { status: 500 }
      );
    }

    const db = getDb();
    const now = Timestamp.now();

    // Fetch pending emails where scheduledFor <= now
    const q = query(
      collection(db, 'emailQueue'),
      where('status', '==', 'pending'),
      where('scheduledFor', '<=', now),
      orderBy('scheduledFor', 'asc'),
      firestoreLimit(50)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ sent: 0, failed: 0, message: 'No pending emails' });
    }

    const transporter = getTransporter();
    let sent = 0;
    let failed = 0;

    for (const emailDoc of snapshot.docs) {
      const email = emailDoc.data();
      const docRef = doc(db, 'emailQueue', emailDoc.id);

      try {
        await transporter.sendMail({
          from: `"${tenant.appName}" <${GMAIL_USER}>`,
          to: email.recipientEmail,
          subject: email.subject,
          html: email.bodyHtml,
        });

        await updateDoc(docRef, {
          status: 'sent',
          sentAt: serverTimestamp(),
        });

        sent++;
        console.log(`Email sent to ${email.recipientEmail}: ${email.subject}`);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown send error';
        await updateDoc(docRef, {
          status: 'failed',
          error: errorMessage,
        });

        failed++;
        console.error(`Email failed for ${email.recipientEmail}:`, errorMessage);
      }
    }

    return NextResponse.json({ sent, failed });
  } catch (error) {
    console.error('Error processing email queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process queue' },
      { status: 500 }
    );
  }
}

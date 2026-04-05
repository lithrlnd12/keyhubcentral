import { NextRequest, NextResponse } from 'next/server';
import {
  collection,
  getDocs,
  addDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { env } from '@/lib/env';
import { EmailTriggerEvent } from '@/types/emailTemplate';
import { renderTemplate, wrapInBrandedLayout } from '@/lib/email/templateEngine';
import { tenant } from '@/lib/config/tenant';

const CRON_SECRET = process.env.CRON_SECRET;

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

interface TriggerRequestBody {
  event: EmailTriggerEvent;
  context: Record<string, unknown>;
  recipientEmail: string;
  recipientName: string;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: require CRON_SECRET
    const authHeader = request.headers.get('authorization');

    if (!CRON_SECRET) {
      console.error('CRON_SECRET not configured - rejecting request');
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: TriggerRequestBody = await request.json();
    const { event, context, recipientEmail, recipientName } = body;

    if (!event || !recipientEmail) {
      return NextResponse.json(
        { error: 'event and recipientEmail are required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Find all enabled templates matching this trigger event
    const q = query(
      collection(db, 'emailTemplates'),
      where('trigger', '==', event),
      where('enabled', '==', true)
    );
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return NextResponse.json({ queued: 0, message: 'No matching templates' });
    }

    // Inject company context so templates can always reference {{company.*}}
    const fullContext: Record<string, unknown> = {
      company: {
        name: tenant.appName,
        phone: tenant.phone,
        email: tenant.supportEmail,
        tagline: tenant.tagline,
      },
      ...context,
    };

    let queued = 0;

    for (const templateDoc of snapshot.docs) {
      const template = templateDoc.data();

      // Check trigger conditions if present
      if (template.triggerConditions) {
        let conditionsMet = true;
        for (const [condPath, expectedValue] of Object.entries(template.triggerConditions)) {
          const parts = condPath.split('.');
          let current: unknown = fullContext;
          for (const part of parts) {
            if (current && typeof current === 'object') {
              current = (current as Record<string, unknown>)[part];
            } else {
              current = undefined;
              break;
            }
          }
          if (String(current) !== expectedValue) {
            conditionsMet = false;
            break;
          }
        }
        if (!conditionsMet) continue;
      }

      // Render subject and body with context
      const renderedSubject = renderTemplate(template.subject, fullContext);
      const renderedBody = renderTemplate(template.bodyHtml, fullContext);
      const wrappedBody = wrapInBrandedLayout(renderedBody);

      // Calculate scheduled time (now + delayMinutes)
      const delayMs = (template.delayMinutes || 0) * 60 * 1000;
      const scheduledFor = Timestamp.fromMillis(Date.now() + delayMs);

      // Add to email queue
      await addDoc(collection(db, 'emailQueue'), {
        templateId: templateDoc.id,
        recipientEmail,
        recipientName,
        subject: renderedSubject,
        bodyHtml: wrappedBody,
        status: 'pending',
        scheduledFor,
        sentAt: null,
        error: null,
        metadata: body.context?.metadata as Record<string, string> || {},
        createdAt: serverTimestamp(),
      });

      queued++;
    }

    return NextResponse.json({ queued });
  } catch (error) {
    console.error('Error triggering email automation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to trigger emails' },
      { status: 500 }
    );
  }
}

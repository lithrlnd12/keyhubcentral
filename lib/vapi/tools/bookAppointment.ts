import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';

type TimeBlock = 'am' | 'pm' | 'evening';

const TIME_BLOCK_CONFIG: Record<TimeBlock, { start: number; end: number; label: string }> = {
  am: { start: 6, end: 12, label: 'Morning (6AM-12PM)' },
  pm: { start: 12, end: 18, label: 'Afternoon (12PM-6PM)' },
  evening: { start: 18, end: 22, label: 'Evening (6PM-10PM)' },
};

interface GoogleCalendarIntegration {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

async function refreshAccessToken(
  refreshToken: string
): Promise<{ accessToken: string; expiresAt: number }> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar client credentials not configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to refresh Google token: ${errorBody}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function getValidAccessToken(
  db: FirebaseFirestore.Firestore,
  userId: string,
  integration: GoogleCalendarIntegration
): Promise<string> {
  // If token is still valid (with 5-minute buffer), use it
  if (integration.expiresAt > Date.now() + 5 * 60 * 1000) {
    return integration.accessToken;
  }

  // Refresh the token
  const { accessToken, expiresAt } = await refreshAccessToken(integration.refreshToken);

  // Persist the new token
  await db
    .collection('users')
    .doc(userId)
    .collection('integrations')
    .doc('googleCalendar')
    .update({ accessToken, expiresAt });

  return accessToken;
}

async function createCalendarEvent(
  accessToken: string,
  params: {
    summary: string;
    date: string;
    timeBlock: TimeBlock;
    customerName: string;
    customerPhone: string;
    description?: string;
  }
): Promise<void> {
  const config = TIME_BLOCK_CONFIG[params.timeBlock];
  const startHour = config.start.toString().padStart(2, '0');
  const endHour = config.end.toString().padStart(2, '0');

  const event = {
    summary: params.summary,
    description: params.description || `Appointment with ${params.customerName} (${params.customerPhone})`,
    start: {
      dateTime: `${params.date}T${startHour}:00:00`,
      timeZone: 'America/New_York',
    },
    end: {
      dateTime: `${params.date}T${endHour}:00:00`,
      timeZone: 'America/New_York',
    },
    attendees: [
      {
        displayName: params.customerName,
        email: `${params.customerPhone}@placeholder.keyhub.com`,
      },
    ],
  };

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to create Google Calendar event: ${errorBody}`);
  }
}

async function bookAppointmentHandler(
  params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const userId = params.userId as string;
  const date = params.date as string;
  const timeBlock = params.timeBlock as TimeBlock;
  const customerName = params.customerName as string;
  const customerPhone = params.customerPhone as string;
  const leadId = params.leadId as string | undefined;
  const description = params.description as string | undefined;

  if (!userId || !date || !timeBlock || !customerName || !customerPhone) {
    throw new Error('userId, date, timeBlock, customerName, and customerPhone are required');
  }

  if (!['am', 'pm', 'evening'].includes(timeBlock)) {
    throw new Error('timeBlock must be one of: am, pm, evening');
  }

  const db = getAdminDb();

  // Look up contractor by userId
  const userDoc = await db.collection('users').doc(userId).get();
  if (!userDoc.exists) {
    throw new Error(`User ${userId} not found`);
  }

  const userData = userDoc.data();

  // Resolve the actual contractor document ID by querying contractors where userId matches.
  // User docs do NOT store contractorId — the contractor doc stores userId instead.
  let contractorId: string = userId; // fallback
  const contractorQuery = await db
    .collection('contractors')
    .where('userId', '==', userId)
    .limit(1)
    .get();
  if (!contractorQuery.empty) {
    contractorId = contractorQuery.docs[0].id;
  }

  // Check current availability before booking
  const availRef = db
    .collection('contractors')
    .doc(contractorId)
    .collection('availability')
    .doc(date);

  const availDoc = await availRef.get();
  const existingBlocks = availDoc.exists ? availDoc.data()?.blocks : null;
  const currentStatus = existingBlocks?.[timeBlock] || 'available';

  if (currentStatus !== 'available') {
    return {
      success: false,
      error: `Time block ${timeBlock} on ${date} is not available (status: ${currentStatus})`,
    };
  }

  // Set the availability block to 'busy'
  if (availDoc.exists) {
    await availRef.update({ [`blocks.${timeBlock}`]: 'busy' });
  } else {
    await availRef.set({
      blocks: {
        am: timeBlock === 'am' ? 'busy' : 'available',
        pm: timeBlock === 'pm' ? 'busy' : 'available',
        evening: timeBlock === 'evening' ? 'busy' : 'available',
      },
    });
  }

  // Always create an in-app appointment record so it shows in the calendar
  const appointmentData = {
    contractorId,
    userId,
    date,
    timeBlock,
    customerName,
    customerPhone,
    description: description || `Consultation with ${customerName}`,
    leadId: leadId || null,
    source: 'voice_call' as const,
    vapiCallId: ctx.callId,
    status: 'scheduled' as const,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  const appointmentRef = await db
    .collection('contractors')
    .doc(contractorId)
    .collection('appointments')
    .add(appointmentData);

  // Also try syncing to Google Calendar if connected (optional enhancement)
  const integrationDoc = await db
    .collection('users')
    .doc(userId)
    .collection('integrations')
    .doc('googleCalendar')
    .get();

  const calendarEventId: string | null = null;
  if (integrationDoc.exists) {
    const integration = integrationDoc.data() as GoogleCalendarIntegration;
    if (integration.accessToken && integration.refreshToken) {
      try {
        const accessToken = await getValidAccessToken(db, userId, integration);
        await createCalendarEvent(accessToken, {
          summary: `Appointment: ${customerName}`,
          date,
          timeBlock,
          customerName,
          customerPhone,
          description,
        });
      } catch (err) {
        // Log but don't fail the booking — the in-app appointment is the source of truth
        console.error('Google Calendar sync failed (in-app appointment still created):', err);
      }
    }
  }

  // Store calendar event ID on the appointment if we got one
  if (calendarEventId) {
    await appointmentRef.update({ googleCalendarEventId: calendarEventId });
  }

  // Update lead with scheduled consultation if leadId provided
  if (leadId && leadId !== 'unknown' && leadId !== 'none') {
    try {
      const blockConfig = TIME_BLOCK_CONFIG[timeBlock];
      const startHour = blockConfig.start.toString().padStart(2, '0');
      const scheduledAt = new Date(`${date}T${startHour}:00:00`);

      await db.collection('leads').doc(leadId).update({
        scheduledConsultationAt: scheduledAt,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } catch (err) {
      console.error(`Failed to update lead ${leadId} with consultation:`, err);
      // Don't fail the booking over a lead update issue
    }
  }

  return {
    success: true,
    appointmentDate: date,
    timeBlock,
  };
}

registerTool({
  name: 'bookAppointment',
  description:
    'Book an appointment for a contractor or sales rep by setting their availability to busy and optionally syncing with Google Calendar.',
  parameters: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        description: 'The contractor or rep userId to book for',
      },
      date: {
        type: 'string',
        description: 'Appointment date in YYYY-MM-DD format',
      },
      timeBlock: {
        type: 'string',
        enum: ['am', 'pm', 'evening'],
        description: 'Time block for the appointment',
      },
      customerName: {
        type: 'string',
        description: 'Name of the customer',
      },
      customerPhone: {
        type: 'string',
        description: 'Phone number of the customer',
      },
      leadId: {
        type: 'string',
        description: 'Optional lead ID to update with scheduled consultation',
      },
      description: {
        type: 'string',
        description: 'Optional description or notes for the appointment',
      },
    },
    required: ['userId', 'date', 'timeBlock', 'customerName', 'customerPhone'],
  },
  handler: bookAppointmentHandler,
});

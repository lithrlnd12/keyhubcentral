import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the token
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get date range from query params
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Get user's Google Calendar integration
    const adminDb = getAdminDb();
    const integrationDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('integrations')
      .doc('googleCalendar')
      .get();

    if (!integrationDoc.exists) {
      return NextResponse.json(
        { error: 'Google Calendar not connected', events: [] },
        { status: 200 }
      );
    }

    const integration = integrationDoc.data();
    if (!integration || !integration.enabled) {
      return NextResponse.json(
        { error: 'Google Calendar not enabled', events: [] },
        { status: 200 }
      );
    }

    // Get OAuth2 client
    const { google } = await import('googleapis');

    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Google Calendar not configured on server' },
        { status: 500 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      expiry_date: integration.expiresAt?.toMillis?.() || null,
    });

    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
      try {
        const updateData: Record<string, unknown> = {
          updatedAt: new Date(),
        };

        if (tokens.access_token) {
          updateData.accessToken = tokens.access_token;
        }
        if (tokens.expiry_date) {
          updateData.expiresAt = new Date(tokens.expiry_date);
        }

        await adminDb
          .collection('users')
          .doc(userId)
          .collection('integrations')
          .doc('googleCalendar')
          .update(updateData);
      } catch (error) {
        console.error('Error updating tokens:', error);
      }
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const calendarId = integration.calendarId || 'primary';

    // Fetch events
    const response = await calendar.events.list({
      calendarId,
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250,
    });

    const events = (response.data.items || []).map((event) => ({
      id: event.id,
      summary: event.summary || 'No title',
      description: event.description,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      isAllDay: !!event.start?.date,
      isBusy: event.transparency !== 'transparent',
      isKeyHubEvent: event.description?.includes('Synced from KeyHub Central') || false,
      htmlLink: event.htmlLink,
      location: event.location,
    }));

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch calendar events' },
      { status: 500 }
    );
  }
}

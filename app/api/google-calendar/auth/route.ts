import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar OAuth credentials not configured');
  }

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/api/google-calendar/callback`
  );
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const returnUrl = searchParams.get('returnUrl') || '/portal/settings';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const oauth2Client = getOAuth2Client();

    // Encode state with userId and return URL
    const state = Buffer.from(
      JSON.stringify({ userId, returnUrl })
    ).toString('base64');

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      state,
      prompt: 'consent', // Force consent to get refresh token
      include_granted_scopes: true,
    });

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Google Calendar auth error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate Google Calendar authorization' },
      { status: 500 }
    );
  }
}

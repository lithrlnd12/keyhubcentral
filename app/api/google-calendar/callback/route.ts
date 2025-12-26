import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

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
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth errors (user denied access, etc.)
    if (error) {
      console.error('Google OAuth error:', error);
      return NextResponse.redirect(
        `${appUrl}/portal/settings?calendarError=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${appUrl}/portal/settings?calendarError=missing_params`
      );
    }

    // Decode state
    let stateData: { userId: string; returnUrl: string };
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      return NextResponse.redirect(
        `${appUrl}/portal/settings?calendarError=invalid_state`
      );
    }

    const { userId, returnUrl } = stateData;

    if (!userId) {
      return NextResponse.redirect(
        `${appUrl}/portal/settings?calendarError=missing_user`
      );
    }

    // Exchange code for tokens
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.redirect(
        `${returnUrl}?calendarError=missing_tokens`
      );
    }

    // Save tokens to Firestore
    const db = getAdminDb();
    const integrationRef = db
      .collection('users')
      .doc(userId)
      .collection('integrations')
      .doc('googleCalendar');

    await integrationRef.set({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: tokens.expiry_date
        ? Timestamp.fromMillis(tokens.expiry_date)
        : null,
      calendarId: 'primary',
      enabled: true,
      lastSyncAt: null,
      lastSyncStatus: 'pending',
      lastSyncError: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Redirect back to settings with success
    return NextResponse.redirect(`${returnUrl}?calendarConnected=true`);
  } catch (error) {
    console.error('Google Calendar callback error:', error);
    return NextResponse.redirect(
      `${appUrl}/portal/settings?calendarError=server_error`
    );
  }
}

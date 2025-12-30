import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { signState } from '@/lib/auth/webhookSignature';
import { verifyFirebaseAuth } from '@/lib/auth/verifyRequest';

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events',
];

// Secret for signing OAuth state (should be in env vars)
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.NEXTAUTH_SECRET || 'keyhub-oauth-state-secret';

// Allowed return URL patterns
const ALLOWED_RETURN_URLS = [
  '/portal/settings',
  '/settings',
  '/kts',
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

function isAllowedReturnUrl(url: string): boolean {
  // Must be a relative path starting with /
  if (!url.startsWith('/')) {
    return false;
  }

  // Check against whitelist
  return ALLOWED_RETURN_URLS.some(allowed => url.startsWith(allowed));
}

export async function GET(request: NextRequest) {
  try {
    // Verify the user is authenticated
    const auth = await verifyFirebaseAuth(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const returnUrl = searchParams.get('returnUrl') || '/portal/settings';

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // SECURITY: Verify the authenticated user matches the requested userId
    if (auth.user.uid !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only connect your own calendar' },
        { status: 403 }
      );
    }

    // Validate returnUrl to prevent open redirect
    const safeReturnUrl = isAllowedReturnUrl(returnUrl) ? returnUrl : '/portal/settings';

    const oauth2Client = getOAuth2Client();

    // Create state payload
    const statePayload = JSON.stringify({
      userId,
      returnUrl: safeReturnUrl,
      timestamp: Date.now(),
    });

    // Sign the state to prevent tampering
    const stateSignature = signState(statePayload, STATE_SECRET);
    const state = Buffer.from(
      JSON.stringify({ payload: statePayload, signature: stateSignature })
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

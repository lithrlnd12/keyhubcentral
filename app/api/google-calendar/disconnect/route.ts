import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyFirebaseAuth } from '@/lib/auth/verifyRequest';

function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return new google.auth.OAuth2(
    clientId,
    clientSecret,
    `${appUrl}/api/google-calendar/callback`
  );
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const auth = await verifyFirebaseAuth(request);

    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized: You must be logged in' },
        { status: 401 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // SECURITY: Verify the authenticated user matches the requested userId
    if (auth.user.uid !== userId) {
      return NextResponse.json(
        { error: 'Forbidden: You can only disconnect your own calendar' },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    const integrationRef = db
      .collection('users')
      .doc(userId)
      .collection('integrations')
      .doc('googleCalendar');

    // Get the current integration to revoke tokens
    const integrationDoc = await integrationRef.get();

    if (integrationDoc.exists) {
      const data = integrationDoc.data();

      // Try to revoke the token with Google
      if (data?.accessToken) {
        try {
          const oauth2Client = getOAuth2Client();
          oauth2Client.setCredentials({ access_token: data.accessToken });
          await oauth2Client.revokeToken(data.accessToken);
        } catch (revokeError) {
          // Log but don't fail if revocation fails
          console.warn('Failed to revoke Google token:', revokeError);
        }
      }

      // Delete the integration document
      await integrationRef.delete();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Google Calendar disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Google Calendar' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase/admin';

// POST - Trigger P&L rebuild which now includes expenses
export async function POST(request: NextRequest) {
  try {
    // Get the authorization token
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the token and get user info
    const auth = getAdminAuth();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const db = getAdminDb();

    // Check if user is admin or owner
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();

    if (!userData || !['owner', 'admin'].includes(userData.role)) {
      return NextResponse.json(
        { error: 'Unauthorized: Only admins can sync expenses' },
        { status: 403 }
      );
    }

    // Call the Cloud Function to rebuild P&L (which now includes expenses)
    const functionUrl = process.env.NODE_ENV === 'production'
      ? 'https://us-central1-key-hub-central.cloudfunctions.net/triggerPnLRebuild'
      : 'https://us-central1-key-hub-central.cloudfunctions.net/triggerPnLRebuild';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloud Function error:', errorText);
      return NextResponse.json(
        { error: 'Failed to sync to Google Sheets' },
        { status: 500 }
      );
    }

    const result = await response.json();
    console.log(`P&L rebuild triggered by ${decodedToken.email}`);

    return NextResponse.json({
      success: true,
      message: 'Expenses synced to Google Sheets successfully',
    });
  } catch (error) {
    console.error('Error syncing expenses:', error);
    return NextResponse.json(
      { error: 'Failed to sync expenses to Google Sheets' },
      { status: 500 }
    );
  }
}

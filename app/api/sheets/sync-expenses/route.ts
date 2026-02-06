import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseAuth, isAdmin } from '@/lib/auth/verifyRequest';

// POST - Trigger P&L rebuild which now includes expenses
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyFirebaseAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!isAdmin(auth.role)) {
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

    await response.json();
    console.log(`P&L rebuild triggered by ${auth.user.email}`);

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

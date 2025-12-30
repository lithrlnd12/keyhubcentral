import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyFirebaseAuth, isAdmin } from '@/lib/auth/verifyRequest';

// GET - Debug endpoint to check Vapi configuration (ADMIN ONLY)
export async function GET(request: NextRequest) {
  // Verify authentication
  const auth = await verifyFirebaseAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', details: auth.error },
      { status: 401 }
    );
  }

  if (!isAdmin(auth.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Admin access required' },
      { status: 403 }
    );
  }

  try {
    const db = getAdminDb();
    const now = Timestamp.now();

    // Check environment variables (only show if set, not values)
    const config = {
      VAPI_API_KEY: process.env.VAPI_API_KEY ? 'SET' : 'NOT SET',
      VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID ? 'SET' : 'NOT SET',
      VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID ? 'SET' : 'NOT SET',
      CRON_SECRET: process.env.CRON_SECRET ? 'SET' : 'NOT SET',
    };

    // Check for leads with scheduled calls
    const leadsSnapshot = await db
      .collection('leads')
      .where('scheduledCallAt', '<=', now)
      .where('status', 'in', ['new', 'assigned'])
      .limit(10)
      .get();

    const leads = leadsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        customer: {
          firstName: data.customer?.firstName,
          // Mask phone numbers
          phone: data.customer?.phone ? '***-***-' + data.customer.phone.slice(-4) : 'N/A',
        },
        scheduledCallAt: data.scheduledCallAt?.toDate?.() || data.scheduledCallAt,
        callAttempts: data.callAttempts || 0,
        status: data.status,
      };
    });

    // Also check all leads with scheduledCallAt set (even if in future)
    const allScheduledLeads = await db
      .collection('leads')
      .where('scheduledCallAt', '!=', null)
      .limit(10)
      .get();

    const allScheduled = allScheduledLeads.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        scheduledCallAt: data.scheduledCallAt?.toDate?.() || data.scheduledCallAt,
        status: data.status,
      };
    });

    return NextResponse.json({
      serverTime: now.toDate(),
      config,
      leadsReadyForCall: leads.length,
      leads,
      allScheduledLeads: allScheduled.length,
      allScheduled,
      authenticatedAs: auth.user?.email,
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug failed' },
      { status: 500 }
    );
  }
}

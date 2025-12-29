import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

// GET - Debug endpoint to check Vapi configuration
export async function GET() {
  try {
    const db = getAdminDb();
    const now = Timestamp.now();

    // Check environment variables
    const config = {
      VAPI_API_KEY: process.env.VAPI_API_KEY ? `${process.env.VAPI_API_KEY.slice(0, 8)}...` : 'NOT SET',
      VAPI_PHONE_NUMBER_ID: process.env.VAPI_PHONE_NUMBER_ID || 'NOT SET',
      VAPI_ASSISTANT_ID: process.env.VAPI_ASSISTANT_ID || 'NOT SET',
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
          phone: data.customer?.phone ? `${data.customer.phone.slice(0, 6)}...` : 'N/A',
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
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Debug failed' },
      { status: 500 }
    );
  }
}

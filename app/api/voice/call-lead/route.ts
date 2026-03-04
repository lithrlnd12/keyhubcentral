import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { createOutboundCall } from '@/lib/vapi/client';
import { FieldValue } from 'firebase-admin/firestore';

// Send immediate Vapi call to a lead after capture form submission
// Public endpoint - called from the capture form (no auth required)
export async function POST(request: NextRequest) {
  try {
    const { leadId, phone, customerName } = await request.json();

    if (!leadId || !phone || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, phone, customerName' },
        { status: 400 }
      );
    }

    // Clean phone number
    let cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '+1' + cleanPhone;
    } else if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    console.log(`Initiating Vapi call for lead ${leadId} to ${cleanPhone}...`);

    // Create the call via Vapi
    const call = await createOutboundCall(cleanPhone, customerName, {
      leadId,
      source: 'capture_form',
    });

    console.log(`Vapi call created for lead ${leadId}, call ID: ${call.id}`);

    // Store call record and update lead via admin SDK
    try {
      const db = getAdminDb();

      await db.collection('voiceCalls').add({
        leadId,
        vapiCallId: call.id,
        phoneNumber: cleanPhone,
        customerName,
        status: call.status,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await db.collection('leads').doc(leadId).update({
        lastCallAt: FieldValue.serverTimestamp(),
        lastCallId: call.id,
        callAttempts: 1,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, callId: call.id, status: call.status });
    } catch (dbError) {
      // Call was initiated even if DB update fails
      console.error('Vapi call initiated but failed to update Firestore:', dbError);
      return NextResponse.json({ success: true, callId: call.id, warning: 'Call started but DB update failed' });
    }
  } catch (error) {
    console.error('Error creating outbound call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create call' },
      { status: 500 }
    );
  }
}

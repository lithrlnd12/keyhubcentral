import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { createOutboundCall } from '@/lib/vapi/client';
import { FieldValue } from 'firebase-admin/firestore';

// POST - Trigger an outbound call to a lead
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, phoneNumber, customerName } = body;

    if (!leadId || !phoneNumber || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, phoneNumber, customerName' },
        { status: 400 }
      );
    }

    // Clean phone number (remove non-digits, ensure country code)
    let cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 10) {
      cleanPhone = '+1' + cleanPhone; // Add US country code
    } else if (!cleanPhone.startsWith('+')) {
      cleanPhone = '+' + cleanPhone;
    }

    console.log(`Initiating call to ${customerName} at ${cleanPhone} for lead ${leadId}`);

    // Create the call via Vapi
    const call = await createOutboundCall(cleanPhone, customerName, {
      leadId,
      source: 'keyhub_auto_followup',
    });

    // Store call record in Firestore
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

    // Update lead with call info
    await db.collection('leads').doc(leadId).update({
      lastCallAt: FieldValue.serverTimestamp(),
      lastCallId: call.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      callId: call.id,
      status: call.status,
    });
  } catch (error) {
    console.error('Error creating outbound call:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create call' },
      { status: 500 }
    );
  }
}

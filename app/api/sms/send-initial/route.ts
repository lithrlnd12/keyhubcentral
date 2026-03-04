import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { sendSms } from '@/lib/sms/provider';
import { getInitialMessage } from '@/lib/sms/ai';
import { FieldValue } from 'firebase-admin/firestore';

// Send initial SMS to a lead immediately after capture form submission
// This is a public endpoint - no auth required (called from the capture form)
export async function POST(request: NextRequest) {
  try {
    const { leadId, phone, customerName } = await request.json();

    if (!leadId || !phone || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, phone, customerName' },
        { status: 400 }
      );
    }

    // Generate and send initial message
    const message = getInitialMessage(customerName);
    console.log(`Sending initial SMS to ${phone} for lead ${leadId}...`);

    const result = await sendSms(phone, message);

    if (!result.success) {
      console.error('SMS send failed:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log(`Initial SMS sent for lead ${leadId}, SID: ${result.messageSid}`);

    // Use admin SDK to create conversation and update lead (bypasses Firestore rules)
    try {
      const db = getAdminDb();

      // Create SMS conversation record
      const conversationRef = await db.collection('smsConversations').add({
        leadId,
        phoneNumber: phone,
        customerName,
        status: 'active',
        messages: [
          {
            role: 'assistant',
            content: message,
            timestamp: FieldValue.serverTimestamp(),
            messageSid: result.messageSid,
            status: 'sent',
          },
        ],
        messageCount: 1,
        analysis: null,
        startedAt: FieldValue.serverTimestamp(),
        lastMessageAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Update lead with SMS info
      await db.collection('leads').doc(leadId).update({
        lastSmsAt: FieldValue.serverTimestamp(),
        lastSmsConversationId: conversationRef.id,
        lastSmsOutcome: 'in_progress',
        smsAttempts: 1,
        smsMessageCount: 1,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({ success: true, conversationId: conversationRef.id });
    } catch (dbError) {
      // SMS was sent successfully even if DB update fails
      console.error('SMS sent but failed to update Firestore:', dbError);
      return NextResponse.json({ success: true, warning: 'SMS sent but DB update failed' });
    }
  } catch (error) {
    console.error('Error sending initial SMS:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send SMS' },
      { status: 500 }
    );
  }
}

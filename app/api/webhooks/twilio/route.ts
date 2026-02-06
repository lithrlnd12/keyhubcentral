import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { getAdminDb } from '@/lib/firebase/admin';
import { sendSms } from '@/lib/sms/provider';
import { generateSmsResponse, analyzeConversation, checkOptOut } from '@/lib/sms/ai';
import { TwilioWebhookPayload } from '@/lib/sms/types';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;

/**
 * Verify Twilio request signature (X-Twilio-Signature).
 * See: https://www.twilio.com/docs/usage/security#validating-requests
 */
function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signature: string | null,
  authToken: string
): boolean {
  if (!signature) return false;

  // Build data string: URL + sorted param keys with values appended
  const sortedKeys = Object.keys(params).sort();
  let data = url;
  for (const key of sortedKeys) {
    data += key + params[key];
  }

  const expected = createHmac('sha1', authToken)
    .update(data)
    .digest('base64');

  return signature === expected;
}

// Local message type using firebase-admin Timestamp
type MessageData = {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Timestamp;
  messageSid?: string;
  status?: string;
};

// POST - Receive incoming SMS from Twilio
export async function POST(request: NextRequest) {
  try {
    // Fail-closed: require Twilio credentials to be configured
    if (!TWILIO_AUTH_TOKEN || !TWILIO_ACCOUNT_SID) {
      console.error('Twilio credentials not configured - rejecting webhook');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // Parse form data (Twilio sends as application/x-www-form-urlencoded)
    const formData = await request.formData();
    const payload: TwilioWebhookPayload = {
      MessageSid: formData.get('MessageSid') as string,
      AccountSid: formData.get('AccountSid') as string,
      From: formData.get('From') as string,
      To: formData.get('To') as string,
      Body: formData.get('Body') as string,
      NumMedia: formData.get('NumMedia') as string,
      NumSegments: formData.get('NumSegments') as string,
    };

    // Verify AccountSid matches our account
    if (payload.AccountSid !== TWILIO_ACCOUNT_SID) {
      console.error('Twilio webhook AccountSid mismatch');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Twilio signature
    const twilioSignature = request.headers.get('X-Twilio-Signature');
    const webhookUrl = request.url;
    const params: Record<string, string> = {};
    formData.forEach((value, key) => {
      params[key] = value as string;
    });

    if (!verifyTwilioSignature(webhookUrl, params, twilioSignature, TWILIO_AUTH_TOKEN)) {
      console.error('Twilio webhook signature verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Twilio webhook received:', payload.MessageSid);

    const { From: fromNumber, Body: incomingMessage } = payload;

    if (!fromNumber || !incomingMessage) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = getAdminDb();

    // Find active conversation for this phone number
    const conversationsSnapshot = await db
      .collection('smsConversations')
      .where('phoneNumber', '==', fromNumber)
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (conversationsSnapshot.empty) {
      console.log('No active conversation found for:', fromNumber);
      // Could create a new conversation here, but for now we only respond to existing ones
      return NextResponse.json({ status: 'no_active_conversation' });
    }

    const conversationDoc = conversationsSnapshot.docs[0];
    const conversation = conversationDoc.data();

    // Add incoming message to conversation
    const newMessage: MessageData = {
      role: 'user',
      content: incomingMessage,
      timestamp: Timestamp.now(),
      messageSid: payload.MessageSid,
      status: 'received',
    };

    const updatedMessages = [...(conversation.messages || []), newMessage];

    // Check for opt-out
    if (checkOptOut(incomingMessage)) {
      // Update conversation as opted out
      await conversationDoc.ref.update({
        messages: updatedMessages,
        status: 'opted_out',
        messageCount: updatedMessages.length,
        lastMessageAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        analysis: {
          conversationOutcome: 'opted_out',
          removeFromList: true,
        },
      });

      // Update lead
      await db.collection('leads').doc(conversation.leadId).update({
        lastSmsOutcome: 'opted_out',
        smsMessageCount: updatedMessages.length,
        smsAnalysis: { conversationOutcome: 'opted_out', removeFromList: true },
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Send opt-out confirmation
      await sendSms(
        fromNumber,
        "You've been removed from our list. We won't text you again. Have a great day!"
      );

      return NextResponse.json({ status: 'opted_out' });
    }

    // Generate AI response
    const { message: responseMessage, shouldEnd } = await generateSmsResponse(
      conversation.customerName,
      updatedMessages.map((m: MessageData) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
      { notes: '' }
    );

    // Send response
    const sendResult = await sendSms(fromNumber, responseMessage);

    // Add response to messages
    const responseMessageObj: MessageData = {
      role: 'assistant',
      content: responseMessage,
      timestamp: Timestamp.now(),
      messageSid: sendResult.messageSid,
      status: sendResult.success ? 'sent' : 'failed',
    };

    const finalMessages = [...updatedMessages, responseMessageObj];

    // Analyze conversation if it should end or has enough messages
    let analysis = conversation.analysis;
    if (shouldEnd || finalMessages.length >= 10) {
      analysis = await analyzeConversation(
        finalMessages.map((m: MessageData) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        }))
      );
    }

    // Update conversation
    const newStatus = shouldEnd ? 'completed' : 'active';
    await conversationDoc.ref.update({
      messages: finalMessages,
      status: newStatus,
      messageCount: finalMessages.length,
      lastMessageAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      ...(analysis && { analysis }),
    });

    // Update lead
    const leadUpdate: Record<string, unknown> = {
      lastSmsAt: FieldValue.serverTimestamp(),
      smsMessageCount: finalMessages.length,
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (shouldEnd) {
      leadUpdate.lastSmsOutcome = 'completed';
      leadUpdate.status = 'contacted';
      leadUpdate.contactedAt = FieldValue.serverTimestamp();
    }

    if (analysis) {
      leadUpdate.smsAnalysis = analysis;

      // Update lead quality based on interest level
      const interestLevel = analysis.interestLevel as string | undefined;
      if (interestLevel === 'high' || interestLevel === 'very_high') {
        leadUpdate.quality = 'hot';
      } else if (interestLevel === 'medium' || interestLevel === 'moderate') {
        leadUpdate.quality = 'warm';
      } else if (interestLevel === 'low' || interestLevel === 'not_interested') {
        leadUpdate.quality = 'cold';
      }
    }

    await db.collection('leads').doc(conversation.leadId).update(leadUpdate);

    console.log(`SMS response sent, conversation ${conversationDoc.id} ${newStatus}`);

    // Return TwiML response (empty - we already sent via API)
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      {
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  } catch (error) {
    console.error('Error processing Twilio webhook:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process SMS' },
      { status: 500 }
    );
  }
}

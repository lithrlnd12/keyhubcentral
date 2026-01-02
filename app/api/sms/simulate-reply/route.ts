import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { sendSms } from '@/lib/sms/provider';
import { generateSmsResponse, analyzeConversation, checkOptOut } from '@/lib/sms/ai';
import { verifyFirebaseAuth, isInternal } from '@/lib/auth/verifyRequest';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

// POST - Simulate a customer reply (for testing)
export async function POST(request: NextRequest) {
  try {
    // Verify authentication - only internal users can simulate
    const auth = await verifyFirebaseAuth(request);
    if (!auth.authenticated || !isInternal(auth.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId, message, sendRealSms = false } = await request.json();

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: 'conversationId and message are required' },
        { status: 400 }
      );
    }

    const db = getAdminDb();

    // Get conversation
    const conversationRef = db.collection('smsConversations').doc(conversationId);
    const conversationDoc = await conversationRef.get();

    if (!conversationDoc.exists) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const conversation = conversationDoc.data()!;

    if (conversation.status !== 'active') {
      return NextResponse.json(
        { error: 'Conversation is not active', status: conversation.status },
        { status: 400 }
      );
    }

    // Add simulated incoming message
    const newMessage = {
      role: 'user' as const,
      content: message,
      timestamp: Timestamp.now(),
      status: 'received' as const,
    };

    const updatedMessages = [...(conversation.messages || []), newMessage];

    // Check for opt-out
    if (checkOptOut(message)) {
      await conversationRef.update({
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

      await db.collection('leads').doc(conversation.leadId).update({
        lastSmsOutcome: 'opted_out',
        smsMessageCount: updatedMessages.length,
        smsAnalysis: { conversationOutcome: 'opted_out', removeFromList: true },
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        status: 'opted_out',
        response: "You've been removed from our list.",
        conversationEnded: true,
      });
    }

    // Define message type for this context
    type MessageData = { role: 'assistant' | 'user'; content: string; timestamp: Timestamp; messageSid?: string; status?: string };

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

    // Optionally send real SMS
    let sendResult: { success: boolean; messageSid?: string } = { success: true, messageSid: 'simulated' };
    if (sendRealSms) {
      sendResult = await sendSms(conversation.phoneNumber, responseMessage);
    }

    // Add response to messages
    const responseMessageObj: MessageData = {
      role: 'assistant',
      content: responseMessage,
      timestamp: Timestamp.now(),
      messageSid: sendResult.messageSid,
      status: sendResult.success ? 'sent' : 'failed',
    };

    const finalMessages = [...updatedMessages, responseMessageObj];

    // Analyze conversation if it should end
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
    await conversationRef.update({
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
    }

    await db.collection('leads').doc(conversation.leadId).update(leadUpdate);

    return NextResponse.json({
      status: newStatus,
      response: responseMessage,
      conversationEnded: shouldEnd,
      messageCount: finalMessages.length,
      analysis: analysis || null,
      realSmsSent: sendRealSms,
    });
  } catch (error) {
    console.error('Error simulating SMS reply:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to simulate reply' },
      { status: 500 }
    );
  }
}

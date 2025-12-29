import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { VapiWebhookPayload } from '@/lib/vapi/types';
import { FieldValue } from 'firebase-admin/firestore';

// POST - Receive webhook events from Vapi
export async function POST(request: NextRequest) {
  try {
    const payload: VapiWebhookPayload = await request.json();

    console.log('Vapi webhook received:', JSON.stringify(payload, null, 2));

    const { message } = payload;
    const call = message.call;

    if (!call) {
      return NextResponse.json({ status: 'ok' });
    }

    const db = getAdminDb();

    // Find the voice call record by Vapi call ID
    const callsSnapshot = await db
      .collection('voiceCalls')
      .where('vapiCallId', '==', call.id)
      .limit(1)
      .get();

    if (callsSnapshot.empty) {
      console.log('No matching call record found for:', call.id);
      return NextResponse.json({ status: 'ok' });
    }

    const callDoc = callsSnapshot.docs[0];
    const callData = callDoc.data();

    switch (message.type) {
      case 'status-update':
        // Update call status
        await callDoc.ref.update({
          status: call.status,
          updatedAt: FieldValue.serverTimestamp(),
        });
        break;

      case 'end-of-call-report':
        // Call ended - save all the details
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const vapiCall = call as any; // Extended call data from Vapi

        const updateData: Record<string, unknown> = {
          status: 'completed',
          endedReason: call.endedReason,
          duration: call.messages
            ? Math.max(...call.messages.map((m) => m.secondsFromStart || 0))
            : 0,
          transcript: call.transcript || message.transcript,
          summary: call.summary || message.summary,
          recordingUrl: call.recordingUrl || message.recordingUrl,
          cost: call.cost,
          costBreakdown: call.costBreakdown,
          messages: call.messages,
          // Capture structured data extracted by Vapi
          structuredData: vapiCall.analysis?.structuredData || null,
          analysis: vapiCall.analysis || null,
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        console.log('Vapi structured data:', JSON.stringify(vapiCall.analysis?.structuredData, null, 2));

        // Determine call outcome
        if (call.endedReason === 'customer-ended-call' || call.endedReason === 'assistant-ended-call') {
          updateData.outcome = 'answered';
        } else if (call.endedReason === 'voicemail') {
          updateData.outcome = 'voicemail';
        } else if (call.endedReason === 'customer-did-not-answer') {
          updateData.outcome = 'no_answer';
        } else if (call.endedReason === 'customer-busy') {
          updateData.outcome = 'busy';
        } else {
          updateData.outcome = 'failed';
        }

        await callDoc.ref.update(updateData);

        // Update the lead with call results
        if (callData.leadId) {
          const leadUpdate: Record<string, unknown> = {
            lastCallOutcome: updateData.outcome,
            lastCallSummary: call.summary || message.summary,
            lastCallTranscript: call.transcript || message.transcript,
            lastCallRecordingUrl: call.recordingUrl || message.recordingUrl,
            // Save structured data from Vapi analysis
            callAnalysis: vapiCall.analysis?.structuredData || null,
            updatedAt: FieldValue.serverTimestamp(),
          };

          // If call was answered and went well, mark lead as contacted
          if (updateData.outcome === 'answered') {
            leadUpdate.status = 'contacted';
            leadUpdate.contactedAt = FieldValue.serverTimestamp();
          }

          await db.collection('leads').doc(callData.leadId).update(leadUpdate);
          console.log(`Lead ${callData.leadId} updated with call analysis:`, vapiCall.analysis?.structuredData);
        }

        console.log(`Call ${call.id} completed. Outcome: ${updateData.outcome}`);
        break;

      case 'transcript':
        // Real-time transcript update (optional - can be noisy)
        // Could store partial transcripts if needed
        break;

      default:
        console.log('Unhandled webhook type:', message.type);
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing Vapi webhook:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

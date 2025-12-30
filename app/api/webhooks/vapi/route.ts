import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { VapiWebhookPayload, VapiCall } from '@/lib/vapi/types';
import { FieldValue } from 'firebase-admin/firestore';

// Helper to remove undefined values (Firestore doesn't accept undefined)
function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  );
}

// POST - Receive webhook events from Vapi
export async function POST(request: NextRequest) {
  try {
    const rawPayload = await request.json();
    const payload = rawPayload as VapiWebhookPayload;

    console.log('Vapi webhook received:', JSON.stringify(rawPayload, null, 2));

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
        // Extended call data from Vapi (includes analysis field not in our types)
        const vapiCall = call as VapiCall & { analysis?: { structuredData?: Record<string, unknown> } };

        const updateData: Record<string, unknown> = {
          status: 'completed',
          endedReason: call.endedReason || null,
          duration: call.messages
            ? Math.max(...call.messages.map((m) => m.secondsFromStart || 0))
            : 0,
          transcript: call.transcript || message.transcript || null,
          summary: call.summary || message.summary || null,
          recordingUrl: call.recordingUrl || message.recordingUrl || null,
          cost: call.cost || 0,
          costBreakdown: call.costBreakdown || null,
          messages: call.messages || null,
          // Note: structuredData will be extracted and added after parsing
          rawAnalysis: vapiCall.analysis || null,
          completedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        // Extract structured data from Vapi webhook
        // Vapi puts it in message.artifact.structuredOutputs.{uuid}.result
        let structuredData: Record<string, unknown> | undefined;

        // Check message-level artifact first (where Vapi actually puts it)
        const artifact = message.artifact as Record<string, unknown> | undefined;
        const structuredOutputs = artifact?.structuredOutputs as Record<string, unknown> | undefined;

        console.log('Vapi artifact:', JSON.stringify(artifact ? Object.keys(artifact) : null, null, 2));
        console.log('Vapi structuredOutputs:', JSON.stringify(structuredOutputs, null, 2));
        console.log('Vapi endedReason:', call.endedReason);

        if (structuredOutputs) {
          // structuredOutputs is keyed by UUID, find the first one with a result
          for (const key of Object.keys(structuredOutputs)) {
            const output = structuredOutputs[key] as Record<string, unknown> | undefined;
            if (output?.result && typeof output.result === 'object') {
              structuredData = output.result as Record<string, unknown>;
              console.log(`Extracted structured data from structuredOutputs.${key}.result:`, JSON.stringify(structuredData, null, 2));
              break;
            }
          }
        }

        // Fallback: check call.analysis.structuredData (older Vapi format)
        if (!structuredData) {
          const rawStructuredData = vapiCall.analysis?.structuredData as Record<string, unknown> | undefined;
          if (rawStructuredData) {
            const firstKey = Object.keys(rawStructuredData)[0];
            const firstValue = rawStructuredData[firstKey] as Record<string, unknown> | undefined;
            if (firstValue?.result && typeof firstValue.result === 'object') {
              structuredData = firstValue.result as Record<string, unknown>;
            } else if (rawStructuredData.timeline || rawStructuredData.projectType || rawStructuredData.callOutcome) {
              structuredData = rawStructuredData;
            }
          }
        }

        // Determine call outcome - prefer structured data's callOutcome if available
        const vapiCallOutcome = structuredData?.callOutcome as string | undefined;

        if (vapiCallOutcome === 'answered' || vapiCallOutcome === 'successful') {
          updateData.outcome = 'answered';
        } else if (vapiCallOutcome === 'voicemail') {
          updateData.outcome = 'voicemail';
        } else if (vapiCallOutcome === 'no_answer' || vapiCallOutcome === 'not_answered') {
          updateData.outcome = 'no_answer';
        } else if (vapiCallOutcome === 'busy') {
          updateData.outcome = 'busy';
        } else if (vapiCallOutcome === 'failed') {
          updateData.outcome = 'failed';
        } else if (call.endedReason === 'customer-ended-call' || call.endedReason === 'assistant-ended-call') {
          updateData.outcome = 'answered';
        } else if (call.endedReason === 'voicemail') {
          updateData.outcome = 'voicemail';
        } else if (call.endedReason === 'customer-did-not-answer') {
          updateData.outcome = 'no_answer';
        } else if (call.endedReason === 'customer-busy') {
          updateData.outcome = 'busy';
        } else if (call.transcript || call.summary || message.transcript || message.summary) {
          // If we have a transcript or summary, the call was likely answered
          updateData.outcome = 'answered';
        } else {
          updateData.outcome = 'failed';
        }

        // Add extracted structured data to the update
        if (structuredData) {
          updateData.structuredData = structuredData;
        }

        await callDoc.ref.update(removeUndefined(updateData));

        // Update the lead with call results
        if (callData.leadId) {
          const leadUpdate: Record<string, unknown> = {
            lastCallOutcome: updateData.outcome,
            lastCallSummary: call.summary || message.summary || null,
            lastCallTranscript: call.transcript || message.transcript || null,
            lastCallRecordingUrl: call.recordingUrl || message.recordingUrl || null,
            // Save structured data from Vapi analysis
            callAnalysis: structuredData || null,
            updatedAt: FieldValue.serverTimestamp(),
          };

          // If call was answered and went well, mark lead as contacted
          if (updateData.outcome === 'answered') {
            leadUpdate.status = 'contacted';
            leadUpdate.contactedAt = FieldValue.serverTimestamp();
          }

          // Update lead quality based on interestLevel from call analysis
          const interestLevel = structuredData?.interestLevel as string | undefined;
          if (interestLevel) {
            if (interestLevel === 'high' || interestLevel === 'very_high') {
              leadUpdate.quality = 'hot';
            } else if (interestLevel === 'medium' || interestLevel === 'moderate') {
              leadUpdate.quality = 'warm';
            } else if (interestLevel === 'low' || interestLevel === 'none' || interestLevel === 'not_interested') {
              leadUpdate.quality = 'cold';
            }
            console.log(`Lead quality updated to ${leadUpdate.quality} based on interestLevel: ${interestLevel}`);
          }

          await db.collection('leads').doc(callData.leadId).update(removeUndefined(leadUpdate));
          console.log(`Lead ${callData.leadId} updated with call analysis:`, structuredData);
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

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { VapiWebhookPayload, VapiCall } from '@/lib/vapi/types';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import {
  InboundCallAnalysis,
  PrimaryConcern,
  Urgency,
  EmotionalSignal,
} from '@/types/inboundCall';

// Vapi webhook secret for signature verification
const VAPI_WEBHOOK_SECRET = process.env.VAPI_WEBHOOK_SECRET;

// Helper to remove undefined values (Firestore doesn't accept undefined)
function removeUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  );
}

// Extract structured data from Vapi webhook message
function extractStructuredData(
  message: VapiWebhookPayload['message'],
  call: VapiCall & { analysis?: { structuredData?: Record<string, unknown> } }
): Record<string, unknown> | undefined {
  let structuredData: Record<string, unknown> | undefined;

  // Check message-level artifact first (where Vapi actually puts it)
  const artifact = message.artifact as Record<string, unknown> | undefined;
  const structuredOutputs = artifact?.structuredOutputs as Record<string, unknown> | undefined;

  if (structuredOutputs) {
    // structuredOutputs is keyed by UUID, find the first one with a result
    for (const key of Object.keys(structuredOutputs)) {
      const output = structuredOutputs[key] as Record<string, unknown> | undefined;
      if (output?.result && typeof output.result === 'object') {
        structuredData = output.result as Record<string, unknown>;
        break;
      }
    }
  }

  // Fallback: check call.analysis.structuredData (older Vapi format)
  if (!structuredData) {
    const rawStructuredData = call.analysis?.structuredData as Record<string, unknown> | undefined;
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

  return structuredData;
}

// Handle inbound phone calls
async function handleInboundCall(
  db: Firestore,
  call: VapiCall,
  message: VapiWebhookPayload['message']
): Promise<void> {
  // Extended call data from Vapi (includes analysis field not in our types)
  const vapiCall = call as VapiCall & { analysis?: { structuredData?: Record<string, unknown> } };

  // Extract structured data
  const structuredData = extractStructuredData(message, vapiCall);

  // Get caller phone from customer object
  const callerPhone = (call.customer as { number?: string })?.number || 'Unknown';
  const callerName = structuredData?.callerName as string | null || null;

  // Parse analysis fields with proper type validation
  const projectType = structuredData?.projectType as string | null || null;

  // Validate urgency enum
  const rawUrgency = structuredData?.urgency as string | undefined;
  const urgency: Urgency | null =
    rawUrgency === 'exploring' || rawUrgency === 'ready' || rawUrgency === 'urgent'
      ? rawUrgency
      : null;

  // Validate primary concern enum
  const rawConcern = structuredData?.primaryConcern as string | undefined;
  const primaryConcern: PrimaryConcern | null =
    rawConcern === 'price' || rawConcern === 'timeline' || rawConcern === 'warranty' || rawConcern === 'trust'
      ? rawConcern
      : null;

  // Validate emotional signal enum
  const rawSignal = structuredData?.emotionalSignal as string | undefined;
  const emotionalSignal: EmotionalSignal | null =
    rawSignal === 'frustrated' || rawSignal === 'excited' || rawSignal === 'skeptical' || rawSignal === 'neutral'
      ? rawSignal
      : null;

  const timeline = structuredData?.timeline as string | null || null;
  const notes = structuredData?.notes as string | null || structuredData?.additionalNotes as string | null || null;

  // Calculate duration from messages
  const duration = call.messages
    ? Math.max(...call.messages.map((m) => m.secondsFromStart || 0))
    : 0;

  const analysis: InboundCallAnalysis = {
    projectType,
    primaryConcern,
    urgency,
    emotionalSignal,
    timeline,
    notes,
  };

  const inboundCallData = {
    vapiCallId: call.id,
    caller: {
      phone: callerPhone,
      name: callerName,
    },
    analysis,
    duration,
    recordingUrl: call.recordingUrl || (message as { recordingUrl?: string }).recordingUrl || null,
    transcript: call.transcript || message.transcript || null,
    summary: call.summary || message.summary || null,
    status: 'new',
    closedReason: null,
    linkedLeadId: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await db.collection('inboundCalls').add(removeUndefined(inboundCallData as Record<string, unknown>));
  console.log(`Inbound call from ${callerPhone} saved. Project: ${projectType || 'Unknown'}, Urgency: ${urgency || 'Unknown'}`);
}

// POST - Receive webhook events from Vapi
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    // Vapi can be configured to send a secret in headers
    if (VAPI_WEBHOOK_SECRET) {
      const webhookSecret = request.headers.get('x-vapi-secret');

      if (webhookSecret !== VAPI_WEBHOOK_SECRET) {
        console.error('Vapi webhook secret verification failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } else {
      console.warn('VAPI_WEBHOOK_SECRET not configured - verification disabled');
    }

    const rawPayload = await request.json();
    const payload = rawPayload as VapiWebhookPayload;

    console.log('Vapi webhook received:', JSON.stringify(rawPayload, null, 2));

    const { message } = payload;
    const call = message.call;

    if (!call) {
      return NextResponse.json({ status: 'ok' });
    }

    const db = getAdminDb();

    // Check if this is an inbound call (no existing voiceCalls record expected)
    // Vapi sends call.type = 'inboundPhoneCall' for inbound calls
    const callType = (call as { type?: string }).type;
    if (callType === 'inboundPhoneCall' && message.type === 'end-of-call-report') {
      await handleInboundCall(db, call, message);
      return NextResponse.json({ status: 'ok' });
    }

    // Find the voice call record by Vapi call ID (for outbound calls)
    const callsSnapshot = await db
      .collection('voiceCalls')
      .where('vapiCallId', '==', call.id)
      .limit(1)
      .get();

    if (callsSnapshot.empty) {
      // Check if this might be an inbound call that wasn't caught above
      if (callType === 'inboundPhoneCall') {
        console.log('Inbound call webhook received (non end-of-call-report):', message.type);
        return NextResponse.json({ status: 'ok' });
      }
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

        // Extract structured data using shared helper
        const structuredData = extractStructuredData(message, vapiCall);

        console.log('Vapi endedReason:', call.endedReason);
        if (structuredData) {
          console.log('Extracted structured data:', JSON.stringify(structuredData, null, 2));
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

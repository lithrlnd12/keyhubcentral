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
  const messageAny = message as Record<string, unknown>;
  const callAny = call as unknown as Record<string, unknown>;

  // Check message-level artifact first (where Vapi actually puts it)
  const artifact = messageAny.artifact as Record<string, unknown> | undefined;
  const structuredOutputs = artifact?.structuredOutputs as Record<string, unknown> | undefined;

  if (structuredOutputs) {
    // structuredOutputs is keyed by UUID, find the first one with a result
    for (const key of Object.keys(structuredOutputs)) {
      const output = structuredOutputs[key] as Record<string, unknown> | undefined;
      if (output?.result && typeof output.result === 'object') {
        structuredData = output.result as Record<string, unknown>;
        console.log(`Found structured data in artifact.structuredOutputs.${key}.result`);
        break;
      }
      // Also check if the output itself is the data (without .result wrapper)
      if (output && !output.result && typeof output === 'object' && Object.keys(output).length > 0) {
        const hasDataFields = 'callerName' in output || 'projectType' in output || 'urgency' in output;
        if (hasDataFields) {
          structuredData = output;
          console.log(`Found structured data directly in artifact.structuredOutputs.${key}`);
          break;
        }
      }
    }
  }

  // Check message.analysis (another Vapi format)
  if (!structuredData) {
    const messageAnalysis = messageAny.analysis as Record<string, unknown> | undefined;
    if (messageAnalysis?.structuredData) {
      structuredData = messageAnalysis.structuredData as Record<string, unknown>;
      console.log('Found structured data in message.analysis.structuredData');
    }
  }

  // Check message.structuredData directly
  if (!structuredData && messageAny.structuredData) {
    structuredData = messageAny.structuredData as Record<string, unknown>;
    console.log('Found structured data in message.structuredData');
  }

  // Check call.structuredData directly
  if (!structuredData && callAny.structuredData) {
    structuredData = callAny.structuredData as Record<string, unknown>;
    console.log('Found structured data in call.structuredData');
  }

  // Fallback: check call.analysis.structuredData (older Vapi format)
  if (!structuredData) {
    const rawStructuredData = call.analysis?.structuredData as Record<string, unknown> | undefined;
    if (rawStructuredData) {
      const firstKey = Object.keys(rawStructuredData)[0];
      const firstValue = rawStructuredData[firstKey] as Record<string, unknown> | undefined;
      if (firstValue?.result && typeof firstValue.result === 'object') {
        structuredData = firstValue.result as Record<string, unknown>;
        console.log('Found structured data in call.analysis.structuredData[key].result');
      } else if (rawStructuredData.timeline || rawStructuredData.projectType || rawStructuredData.callOutcome) {
        structuredData = rawStructuredData;
        console.log('Found structured data directly in call.analysis.structuredData');
      }
    }
  }

  // Check call.analysis directly for inbound call fields
  if (!structuredData && call.analysis) {
    const analysis = call.analysis as Record<string, unknown>;
    if (analysis.callerName || analysis.projectType || analysis.urgency) {
      structuredData = analysis;
      console.log('Found structured data directly in call.analysis');
    }
  }

  return structuredData;
}

// Parse caller info from conversation messages (fallback when structured data is missing)
interface ParsedConversationInfo {
  callerName: string | null;
  projectType: string | null;
  timeline: string | null;
  primaryConcern: string | null;
  transcript: string | null;
}

function parseConversationForCallerInfo(
  message: VapiWebhookPayload['message']
): ParsedConversationInfo {
  const result: ParsedConversationInfo = {
    callerName: null,
    projectType: null,
    timeline: null,
    primaryConcern: null,
    transcript: null,
  };

  const messageAny = message as Record<string, unknown>;
  const artifact = messageAny.artifact as Record<string, unknown> | undefined;
  const messages = artifact?.messages as Array<{ role: string; message?: string; content?: string }> | undefined;

  if (!messages || messages.length === 0) {
    return result;
  }

  // Build transcript from messages
  const transcriptParts: string[] = [];
  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'bot') {
      const text = msg.message || msg.content;
      if (text) {
        const speaker = msg.role === 'user' ? 'Customer' : 'Riley';
        transcriptParts.push(`${speaker}: ${text}`);
      }
    }
  }
  result.transcript = transcriptParts.join('\n');

  // Get user messages only
  const userMessages = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.message || m.content || '');

  // Look for name pattern - typically comes after "May I get your name" question
  // User often responds with their name
  for (let i = 0; i < userMessages.length; i++) {
    const userMsg = userMessages[i].trim();
    // Short response (2-4 words) that's likely a name
    const words = userMsg.split(/\s+/).filter(w => w.length > 0);
    if (words.length >= 1 && words.length <= 4) {
      // Check if it looks like a name (starts with capital, doesn't start with common phrases)
      const firstWord = words[0];
      if (
        firstWord &&
        firstWord[0] === firstWord[0].toUpperCase() &&
        !['Yeah', 'Yes', 'No', 'Okay', 'This', 'That', 'Finding', 'Thank'].includes(firstWord)
      ) {
        // This is likely the name
        result.callerName = userMsg.replace(/\.$/, ''); // Remove trailing period
        break;
      }
    }
  }

  // Look for project type in messages
  const allText = userMessages.join(' ').toLowerCase();
  if (allText.includes('bathroom')) {
    result.projectType = 'bathroom';
  } else if (allText.includes('kitchen')) {
    result.projectType = 'kitchen';
  } else if (allText.includes('flooring') || allText.includes('floor')) {
    result.projectType = 'flooring';
  } else if (allText.includes('roof')) {
    result.projectType = 'roofing';
  } else if (allText.includes('window')) {
    result.projectType = 'windows';
  } else if (allText.includes('siding')) {
    result.projectType = 'siding';
  }

  // Look for timeline
  const timelineMatch = allText.match(/(\d+)\s*(month|week|day)/);
  if (timelineMatch) {
    result.timeline = timelineMatch[0];
  } else if (allText.includes('asap') || allText.includes('soon') || allText.includes('urgent')) {
    result.timeline = 'urgent';
  }

  // Look for primary concern
  if (allText.includes('trustworthy') || allText.includes('trust')) {
    result.primaryConcern = 'trust';
  } else if (allText.includes('price') || allText.includes('cost') || allText.includes('budget')) {
    result.primaryConcern = 'price';
  } else if (allText.includes('timeline') || allText.includes('quick') || allText.includes('fast')) {
    result.primaryConcern = 'timeline';
  } else if (allText.includes('warranty') || allText.includes('guarantee')) {
    result.primaryConcern = 'warranty';
  }

  return result;
}

// Handle inbound phone calls
async function handleInboundCall(
  db: Firestore,
  call: VapiCall,
  message: VapiWebhookPayload['message']
): Promise<void> {
  // Extended call data from Vapi (includes analysis field not in our types)
  const vapiCall = call as VapiCall & { analysis?: { structuredData?: Record<string, unknown> } };

  // Check if we already have this call (avoid duplicates from status-update + end-of-call-report)
  const existingCall = await db
    .collection('inboundCalls')
    .where('vapiCallId', '==', call.id)
    .limit(1)
    .get();

  if (!existingCall.empty) {
    // Update existing call with any new data (structured outputs might come in later message)
    console.log(`Inbound call ${call.id} already exists, updating with new data`);
    const existingDoc = existingCall.docs[0];
    const existingData = existingDoc.data();

    // Only update if we have new structured data or the existing call lacks analysis
    const vapiCall = call as VapiCall & { analysis?: { structuredData?: Record<string, unknown> } };
    const structuredData = extractStructuredData(message, vapiCall);
    const parsedFromConversation = parseConversationForCallerInfo(message);

    if (structuredData || !existingData.caller?.name) {
      const callerName = (structuredData?.callerName as string | null) || parsedFromConversation.callerName || existingData.caller?.name;
      const projectType = (structuredData?.projectType as string | null) || parsedFromConversation.projectType || existingData.analysis?.projectType;
      const rawConcern = (structuredData?.primaryConcern as string | undefined) || parsedFromConversation.primaryConcern;
      const primaryConcern: PrimaryConcern | null =
        rawConcern === 'price' || rawConcern === 'timeline' || rawConcern === 'warranty' || rawConcern === 'trust'
          ? rawConcern
          : existingData.analysis?.primaryConcern || null;

      await existingDoc.ref.update(removeUndefined({
        'caller.name': callerName,
        'analysis.projectType': projectType,
        'analysis.primaryConcern': primaryConcern,
        'analysis.timeline': (structuredData?.timeline as string | null) || parsedFromConversation.timeline || existingData.analysis?.timeline,
        transcript: call.transcript || message.transcript || parsedFromConversation.transcript || existingData.transcript,
        recordingUrl: call.recordingUrl || (message as { recordingUrl?: string }).recordingUrl || existingData.recordingUrl,
        summary: call.summary || message.summary || existingData.summary,
        updatedAt: FieldValue.serverTimestamp(),
      }));
      console.log(`Updated inbound call ${call.id} with new data`);
    }
    return;
  }

  // Debug logging for inbound call data
  console.log('=== INBOUND CALL DEBUG ===');
  console.log('Message type:', message.type);
  console.log('Call ID:', call.id);
  console.log('Message artifact:', JSON.stringify((message as Record<string, unknown>).artifact, null, 2));
  console.log('Call analysis:', JSON.stringify(vapiCall.analysis, null, 2));
  console.log('Call structuredDataPlan:', JSON.stringify((vapiCall as unknown as Record<string, unknown>).structuredDataPlan, null, 2));
  console.log('Full message keys:', Object.keys(message));
  console.log('Full call keys:', Object.keys(call));
  console.log('=== END DEBUG ===');

  // Extract structured data
  const structuredData = extractStructuredData(message, vapiCall);
  console.log('Extracted structured data for inbound call:', JSON.stringify(structuredData, null, 2));

  // Parse caller info from conversation if no structured data
  const parsedFromConversation = parseConversationForCallerInfo(message);
  console.log('Parsed from conversation:', JSON.stringify(parsedFromConversation, null, 2));

  // Get caller phone from customer object
  const callerPhone = (call.customer as { number?: string })?.number || 'Unknown';
  // Use structured data first, then fall back to parsed conversation
  const callerName = (structuredData?.callerName as string | null) || parsedFromConversation.callerName;

  // Parse analysis fields with proper type validation, using conversation fallback
  const projectType = (structuredData?.projectType as string | null) || parsedFromConversation.projectType;

  // Validate urgency enum
  const rawUrgency = structuredData?.urgency as string | undefined;
  let urgency: Urgency | null =
    rawUrgency === 'exploring' || rawUrgency === 'ready' || rawUrgency === 'urgent'
      ? rawUrgency
      : null;

  // Infer urgency from timeline if not set
  if (!urgency && parsedFromConversation.timeline) {
    if (parsedFromConversation.timeline === 'urgent' || parsedFromConversation.timeline.includes('week')) {
      urgency = 'urgent';
    } else if (parsedFromConversation.timeline.includes('month')) {
      urgency = 'ready';
    }
  }

  // Validate primary concern enum
  const rawConcern = (structuredData?.primaryConcern as string | undefined) || parsedFromConversation.primaryConcern;
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

  const timeline = (structuredData?.timeline as string | null) || parsedFromConversation.timeline;
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
    transcript: call.transcript || message.transcript || parsedFromConversation.transcript || null,
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
    if (VAPI_WEBHOOK_SECRET) {
      const webhookSecret = request.headers.get('x-vapi-secret');
      if (webhookSecret !== VAPI_WEBHOOK_SECRET) {
        console.error('Vapi webhook secret verification failed');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const rawPayload = await request.json();
    const payload = rawPayload as VapiWebhookPayload;

    console.log('Vapi webhook received:', payload.message?.type, 'call:', payload.message?.call?.id);

    const { message } = payload;
    const call = message.call;

    if (!call) {
      return NextResponse.json({ status: 'ok' });
    }

    const db = getAdminDb();

    // Check if this is an inbound call (no existing voiceCalls record expected)
    // Vapi sends call.type = 'inboundPhoneCall' for inbound calls
    const callType = (call as { type?: string }).type;

    // Handle inbound calls on either end-of-call-report OR status-update with ended status
    // The structured outputs come in end-of-call-report, but we can capture basic info from status-update
    if (callType === 'inboundPhoneCall') {
      if (message.type === 'end-of-call-report') {
        console.log('Processing inbound call from end-of-call-report');
        await handleInboundCall(db, call, message);
        return NextResponse.json({ status: 'ok' });
      }

      // Also handle status-update with ended status as a fallback
      // This captures the call even if end-of-call-report doesn't come or lacks structured data
      const statusUpdate = message as { status?: string; endedReason?: string };
      if (message.type === 'status-update' && statusUpdate.status === 'ended') {
        console.log('Processing inbound call from status-update (ended)');
        await handleInboundCall(db, call, message);
        return NextResponse.json({ status: 'ok' });
      }

    }

    // Find the voice call record by Vapi call ID (for outbound calls)
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

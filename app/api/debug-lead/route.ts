import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const leadDoc = await db.collection('leads').doc(id).get();

    if (!leadDoc.exists) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const data = leadDoc.data();

    // Also check voiceCalls for this lead
    const voiceCallsSnapshot = await db.collection('voiceCalls')
      .where('leadId', '==', id)
      .limit(5)
      .get();

    let voiceCallData = null;
    if (!voiceCallsSnapshot.empty) {
      const vcDoc = voiceCallsSnapshot.docs[0];
      const vcData = vcDoc.data();
      voiceCallData = {
        id: vcDoc.id,
        vapiCallId: vcData.vapiCallId,
        status: vcData.status,
        outcome: vcData.outcome,
        structuredData: vcData.structuredData || null,
        rawAnalysis: vcData.rawAnalysis || null,
        hasStructuredData: !!vcData.structuredData,
      };
    }

    // Check webhook logs for this call
    let webhookLogs = null;
    if (voiceCallData?.vapiCallId) {
      const logsSnapshot = await db.collection('webhookLogs')
        .where('callId', '==', voiceCallData.vapiCallId)
        .where('messageType', '==', 'end-of-call-report')
        .limit(1)
        .get();

      if (!logsSnapshot.empty) {
        const logData = logsSnapshot.docs[0].data();
        try {
          const parsed = JSON.parse(logData.rawPayload);
          const call = parsed?.message?.call;
          webhookLogs = {
            hasAnalysis: !!call?.analysis,
            analysisKeys: call?.analysis ? Object.keys(call.analysis) : [],
            analysis: call?.analysis || null,
            // Show all top-level keys in the call object
            callKeys: call ? Object.keys(call) : [],
            // Check for artifact or other fields that might contain structured data
            artifact: call?.artifact || null,
            messages: call?.messages?.length || 0,
            // Show the message type
            messageType: parsed?.message?.type,
          };
        } catch {
          webhookLogs = { error: 'Failed to parse payload' };
        }
      }
    }

    return NextResponse.json({
      lead: {
        id: leadDoc.id,
        callAnalysis: data?.callAnalysis || null,
        lastCallOutcome: data?.lastCallOutcome || null,
        lastCallSummary: data?.lastCallSummary ? data.lastCallSummary.substring(0, 100) + '...' : null,
        hasCallAnalysis: !!data?.callAnalysis,
        callAnalysisKeys: data?.callAnalysis ? Object.keys(data.callAnalysis) : [],
      },
      voiceCall: voiceCallData,
      webhookLogs,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

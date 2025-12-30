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

    return NextResponse.json({
      id: leadDoc.id,
      callAnalysis: data?.callAnalysis || null,
      lastCallOutcome: data?.lastCallOutcome || null,
      lastCallSummary: data?.lastCallSummary || null,
      hasCallAnalysis: !!data?.callAnalysis,
      callAnalysisKeys: data?.callAnalysis ? Object.keys(data.callAnalysis) : [],
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';
import { createDispatchSession, initiateNextCall } from '@/lib/vapi/dispatch';

/**
 * POST /api/voice/dispatch
 * Start a contractor calldown dispatch for a job.
 *
 * Body: { jobId: string }
 * Requires: owner, admin, or pm role
 */
export async function POST(request: NextRequest) {
  // 1. Authenticate
  const auth = await verifyFirebaseAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', details: auth.error },
      { status: 401 }
    );
  }

  if (!hasRole(auth.role, ['owner', 'admin', 'pm'])) {
    return NextResponse.json(
      { error: 'Forbidden: Only owners, admins, and project managers can dispatch contractors' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { jobId } = body;

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing required field: jobId' },
        { status: 400 }
      );
    }

    // 2. Create session and kick off the first call
    const sessionId = await createDispatchSession(jobId, auth.user!.uid);
    await initiateNextCall(sessionId);

    return NextResponse.json({
      sessionId,
      status: 'active',
    });
  } catch (error) {
    console.error('Dispatch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start dispatch' },
      { status: 500 }
    );
  }
}

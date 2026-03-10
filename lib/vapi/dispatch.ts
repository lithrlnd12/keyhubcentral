// AI Dispatch — contractor calldown state machine
// Scores and calls contractors one-by-one until someone accepts a job.

import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { createOutboundCallWithAssistant } from '@/lib/vapi/assistants';
import { calculateDistanceMiles, getDistanceScore } from '@/lib/utils/distance';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DispatchCandidate {
  contractorId: string;
  name: string;
  phone: string;
  score: number;
  callStatus: 'pending' | 'calling' | 'accepted' | 'declined' | 'no_answer' | 'failed';
  vapiCallId?: string;
}

export interface DispatchSession {
  id: string;
  jobId: string;
  initiatedBy: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  candidates: DispatchCandidate[];
  currentIndex: number;
  assignedContractorId?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map job type to the trade string stored on contractor docs. */
function jobTypeToTrade(jobType: string): string {
  // Normalise common aliases — extend as needed
  const mapping: Record<string, string> = {
    roofing: 'roofing',
    siding: 'siding',
    windows: 'windows',
    gutters: 'gutters',
    painting: 'painting',
    hvac: 'hvac',
    plumbing: 'plumbing',
    electrical: 'electrical',
  };
  return mapping[jobType?.toLowerCase()] ?? jobType?.toLowerCase();
}

function todayDateString(): string {
  const now = new Date();
  return now.toISOString().split('T')[0]; // YYYY-MM-DD
}

// ---------------------------------------------------------------------------
// Core functions
// ---------------------------------------------------------------------------

/**
 * Create a new dispatch session for a job.
 * Validates the job status, finds eligible contractors, scores them, and
 * persists the session to Firestore.
 */
export async function createDispatchSession(
  jobId: string,
  initiatedBy: string
): Promise<string> {
  const db = getAdminDb();

  // 1. Validate job exists and is in an actionable status
  const jobDoc = await db.collection('jobs').doc(jobId).get();
  if (!jobDoc.exists) {
    throw new Error(`Job ${jobId} not found`);
  }

  const job = jobDoc.data()!;
  const allowedStatuses = ['production', 'scheduled'];
  if (!allowedStatuses.includes(job.status)) {
    throw new Error(
      `Job ${jobId} is in "${job.status}" status. Dispatch requires one of: ${allowedStatuses.join(', ')}`
    );
  }

  const trade = jobTypeToTrade(job.type);
  const jobLat = job.customer?.address?.lat as number | undefined;
  const jobLng = job.customer?.address?.lng as number | undefined;

  // 2. Query active contractors whose trades include the job type
  const contractorsSnap = await db
    .collection('contractors')
    .where('status', '==', 'active')
    .where('trades', 'array-contains', trade)
    .get();

  if (contractorsSnap.empty) {
    throw new Error(`No active contractors found for trade "${trade}"`);
  }

  // 3. Score contractors: 50% distance + 50% rating, filter by availability
  const today = todayDateString();
  const scoredCandidates: DispatchCandidate[] = [];

  for (const doc of contractorsSnap.docs) {
    const c = doc.data();

    // Check today's availability — at least one block must be 'available'
    const availDoc = await db
      .collection('contractors')
      .doc(doc.id)
      .collection('availability')
      .doc(today)
      .get();

    const blocks = availDoc.exists ? availDoc.data()?.blocks : null;
    const hasAvailableBlock =
      !blocks ||
      ['am', 'pm', 'evening'].some(
        (b) => !blocks[b] || blocks[b] === 'available'
      );

    if (!hasAvailableBlock) continue;

    // Distance score (0-100)
    let distScore = 50; // default when coords are missing
    if (jobLat && jobLng && c.address?.lat && c.address?.lng) {
      const distance = calculateDistanceMiles(
        jobLat,
        jobLng,
        c.address.lat,
        c.address.lng
      );
      const radius = c.serviceRadius || 50;
      distScore = getDistanceScore(distance, radius);
    }

    // Rating score (0-100): rating is 0-5, scale to 0-100
    const ratingScore = ((c.rating?.overall ?? 3) / 5) * 100;

    // Composite score
    const score = Math.round(distScore * 0.5 + ratingScore * 0.5);

    if (!c.phone) continue; // must have a phone number to call

    scoredCandidates.push({
      contractorId: doc.id,
      name: c.displayName || 'Unknown',
      phone: c.phone,
      score,
      callStatus: 'pending',
    });
  }

  if (scoredCandidates.length === 0) {
    throw new Error('No available contractors matched the dispatch criteria');
  }

  // Sort by score descending (best first)
  scoredCandidates.sort((a, b) => b.score - a.score);

  // 4. Persist session
  const sessionRef = db.collection('dispatchSessions').doc();
  const session: Omit<DispatchSession, 'id'> = {
    jobId,
    initiatedBy,
    status: 'active',
    candidates: scoredCandidates,
    currentIndex: 0,
    createdAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
    updatedAt: FieldValue.serverTimestamp() as unknown as FirebaseFirestore.Timestamp,
  };

  await sessionRef.set({ id: sessionRef.id, ...session });

  return sessionRef.id;
}

/**
 * Initiate the next outbound VAPI call in the dispatch sequence.
 * If no more candidates remain, marks the session as failed.
 */
export async function initiateNextCall(sessionId: string): Promise<void> {
  const db = getAdminDb();
  const sessionRef = db.collection('dispatchSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new Error(`Dispatch session ${sessionId} not found`);
  }

  const session = sessionDoc.data() as DispatchSession;

  if (session.status !== 'active') {
    throw new Error(`Dispatch session ${sessionId} is not active (status: ${session.status})`);
  }

  // Find the next pending candidate
  const nextIndex = session.candidates.findIndex(
    (c, i) => i >= session.currentIndex && c.callStatus === 'pending'
  );

  if (nextIndex === -1) {
    // No more candidates — mark session as failed
    await sessionRef.update({
      status: 'failed',
      updatedAt: FieldValue.serverTimestamp(),
    });
    return;
  }

  const candidate = session.candidates[nextIndex];

  // Fetch job details for the assistant prompt
  const jobDoc = await db.collection('jobs').doc(session.jobId).get();
  const job = jobDoc.data()!;
  const addr = job.customer?.address;
  const jobSummary = [
    `Job #${job.jobNumber || session.jobId}`,
    `Type: ${job.type}`,
    addr
      ? `Location: ${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`
      : null,
    `Customer: ${job.customer?.name || 'N/A'}`,
  ]
    .filter(Boolean)
    .join('. ');

  // Create VAPI outbound call
  const assistantId = process.env.VAPI_DISPATCH_ASSISTANT_ID;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!assistantId || !phoneNumberId) {
    throw new Error(
      'Missing VAPI_DISPATCH_ASSISTANT_ID or VAPI_PHONE_NUMBER_ID environment variables'
    );
  }

  const call = await createOutboundCallWithAssistant({
    assistantId,
    phoneNumberId,
    customerNumber: candidate.phone,
    customerName: candidate.name,
    assistantOverrides: {
      model: {
        messages: [
          {
            role: 'system',
            content: [
              `You are calling ${candidate.name} on behalf of Key Trade Solutions to offer a job assignment.`,
              `Job details: ${jobSummary}.`,
              'Ask the contractor if they are available and want to accept this job.',
              'If they accept, call the acceptJob tool. If they decline, call the declineJob tool with their reason.',
              'Be friendly, professional, and concise.',
            ].join(' '),
          },
        ],
      },
    },
    metadata: {
      dispatchSessionId: sessionId,
      contractorId: candidate.contractorId,
      jobId: session.jobId,
    },
  });

  // Update candidate status
  const updatedCandidates = [...session.candidates];
  updatedCandidates[nextIndex] = {
    ...candidate,
    callStatus: 'calling',
    vapiCallId: call.id,
  };

  await sessionRef.update({
    candidates: updatedCandidates,
    currentIndex: nextIndex,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Handle a contractor's response to a dispatch call.
 */
export async function handleDispatchResponse(
  sessionId: string,
  contractorId: string,
  accepted: boolean
): Promise<void> {
  const db = getAdminDb();
  const sessionRef = db.collection('dispatchSessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (!sessionDoc.exists) {
    throw new Error(`Dispatch session ${sessionId} not found`);
  }

  const session = sessionDoc.data() as DispatchSession;

  if (session.status !== 'active') {
    throw new Error(`Dispatch session ${sessionId} is not active`);
  }

  const candidateIndex = session.candidates.findIndex(
    (c) => c.contractorId === contractorId
  );

  if (candidateIndex === -1) {
    throw new Error(`Contractor ${contractorId} not found in dispatch session`);
  }

  const updatedCandidates = [...session.candidates];

  if (accepted) {
    updatedCandidates[candidateIndex] = {
      ...updatedCandidates[candidateIndex],
      callStatus: 'accepted',
    };

    // Assign contractor to the job (array union)
    await db.collection('jobs').doc(session.jobId).update({
      crewIds: FieldValue.arrayUnion(contractorId),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await sessionRef.update({
      candidates: updatedCandidates,
      status: 'completed',
      assignedContractorId: contractorId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  } else {
    updatedCandidates[candidateIndex] = {
      ...updatedCandidates[candidateIndex],
      callStatus: 'declined',
    };

    await sessionRef.update({
      candidates: updatedCandidates,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Move on to the next candidate
    await initiateNextCall(sessionId);
  }
}

/**
 * Retrieve a dispatch session by ID.
 */
export async function getDispatchSession(
  sessionId: string
): Promise<DispatchSession | null> {
  const db = getAdminDb();
  const doc = await db.collection('dispatchSessions').doc(sessionId).get();
  if (!doc.exists) return null;
  return doc.data() as DispatchSession;
}

/**
 * Cancel an active dispatch session.
 */
export async function cancelDispatch(sessionId: string): Promise<void> {
  const db = getAdminDb();
  const sessionRef = db.collection('dispatchSessions').doc(sessionId);
  const doc = await sessionRef.get();

  if (!doc.exists) {
    throw new Error(`Dispatch session ${sessionId} not found`);
  }

  await sessionRef.update({
    status: 'cancelled',
    updatedAt: FieldValue.serverTimestamp(),
  });
}

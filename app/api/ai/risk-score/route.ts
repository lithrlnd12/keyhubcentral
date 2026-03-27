import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';
import { getAdminDb } from '@/lib/firebase/admin';
import { Job } from '@/types/job';
import { Contractor } from '@/types/contractor';
import {
  calculateJobRiskScore,
  RiskScore,
  HistoricalData,
} from '@/lib/ai/riskScoring';

// ============================================================
// POST /api/ai/risk-score
// ============================================================

export async function POST(request: NextRequest) {
  // Authenticate — only internal users (owner, admin, pm, sales_rep)
  const auth = await verifyFirebaseAuth(request);
  if (!auth.authenticated || !hasRole(auth.role, ['owner', 'admin', 'pm', 'sales_rep'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobId, job: inlineJob, contractorId } = body;

    const adminDb = getAdminDb();
    let job: Job | null = null;
    let contractor: Contractor | null = null;

    // Resolve job data
    if (inlineJob) {
      job = inlineJob as Job;
    } else if (jobId) {
      const jobDoc = await adminDb.collection('jobs').doc(jobId).get();
      if (!jobDoc.exists) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      job = { id: jobDoc.id, ...jobDoc.data() } as Job;
    } else {
      return NextResponse.json(
        { error: 'Either jobId or job object is required' },
        { status: 400 }
      );
    }

    // Resolve contractor
    const resolvedContractorId = contractorId || job.crewIds?.[0];
    if (resolvedContractorId) {
      const contractorDoc = await adminDb
        .collection('contractors')
        .doc(resolvedContractorId)
        .get();
      if (contractorDoc.exists) {
        contractor = {
          id: contractorDoc.id,
          ...contractorDoc.data(),
        } as Contractor;
      }
    }

    // Fetch historical data for the contractor (server-side)
    let historicalData: HistoricalData | undefined;
    if (resolvedContractorId) {
      historicalData = await getServerHistoricalData(
        adminDb,
        resolvedContractorId
      );
    }

    // Calculate risk score
    const riskScore = calculateJobRiskScore(job, contractor, historicalData);

    // Build response
    const response: {
      riskScore: RiskScore;
      historicalData?: HistoricalData;
    } = {
      riskScore,
    };

    if (historicalData) {
      response.historicalData = historicalData;
    }

    return NextResponse.json(response);
  } catch (err) {
    console.error('Risk score calculation error:', err);
    return NextResponse.json(
      { error: 'Failed to calculate risk score' },
      { status: 500 }
    );
  }
}

// ============================================================
// Server-side historical data fetcher (uses Admin SDK)
// ============================================================

async function getServerHistoricalData(
  adminDb: FirebaseFirestore.Firestore,
  contractorId: string
): Promise<HistoricalData> {
  const twelveMonthsAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

  // Fetch completed jobs for this contractor
  const jobsSnapshot = await adminDb
    .collection('jobs')
    .where('crewIds', 'array-contains', contractorId)
    .where('status', 'in', ['complete', 'paid_in_full'])
    .orderBy('createdAt', 'desc')
    .get();

  const jobs = jobsSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() } as unknown as Job))
    .filter((job) => {
      const completionDate = job.dates?.actualCompletion || job.dates?.created;
      if (!completionDate) return false;
      const dateMs =
        typeof completionDate.toMillis === 'function'
          ? completionDate.toMillis()
          : (completionDate as unknown as { _seconds: number })._seconds * 1000;
      return dateMs >= twelveMonthsAgo.getTime();
    });

  if (jobs.length === 0) {
    return { totalJobs: 0, callbackCount: 0, callbackRate: 0, avgDaysToCallback: null };
  }

  const jobIds = jobs.map((j) => j.id);
  let callbackCount = 0;
  let totalDaysToCallback = 0;
  let callbacksWithDays = 0;

  // Batch fetch service tickets (Firestore 'in' limited to 30)
  const batchSize = 30;
  for (let i = 0; i < jobIds.length; i += batchSize) {
    const batch = jobIds.slice(i, i + batchSize);
    const ticketsSnapshot = await adminDb
      .collection('serviceTickets')
      .where('jobId', 'in', batch)
      .get();

    for (const ticketDoc of ticketsSnapshot.docs) {
      const ticket = ticketDoc.data();
      const parentJob = jobs.find((j) => j.id === ticket.jobId);
      if (!parentJob) continue;

      const completionDate = parentJob.dates?.actualCompletion;
      if (!completionDate || !ticket.createdAt) {
        callbackCount++;
        continue;
      }

      const completionMs =
        typeof completionDate.toMillis === 'function'
          ? completionDate.toMillis()
          : (completionDate as unknown as { _seconds: number })._seconds * 1000;
      const ticketMs =
        typeof ticket.createdAt.toMillis === 'function'
          ? ticket.createdAt.toMillis()
          : ticket.createdAt._seconds * 1000;

      const daysDiff = (ticketMs - completionMs) / (1000 * 60 * 60 * 24);

      if (daysDiff >= 0 && daysDiff <= 30) {
        callbackCount++;
        totalDaysToCallback += daysDiff;
        callbacksWithDays++;
      }
    }
  }

  const totalJobs = jobs.length;
  const callbackRate = totalJobs > 0 ? callbackCount / totalJobs : 0;
  const avgDaysToCallback =
    callbacksWithDays > 0
      ? Math.round(totalDaysToCallback / callbacksWithDays)
      : null;

  return { totalJobs, callbackCount, callbackRate, avgDaysToCallback };
}

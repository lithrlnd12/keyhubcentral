import { getAdminDb } from './admin';
import { ChatContext } from '@/types/chat';
import { UserRole } from '@/types/user';
import { JobStatus } from '@/types/job';
import { LeadStatus } from '@/types/lead';
import { InvoiceStatus } from '@/types/invoice';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Fetch chat context data for a user based on their role.
 * This is called server-side in the chat API route.
 */
export async function getChatContextForUser(
  userId: string,
  userName: string,
  role: UserRole
): Promise<ChatContext> {
  const db = getAdminDb();
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const context: ChatContext = {
    user: {
      name: userName,
      role: role,
    },
    timestamp: now.toISOString(),
  };

  try {
    // Fetch data based on role
    if (['owner', 'admin'].includes(role)) {
      // Admins/Owners get company-wide view
      await Promise.all([
        fetchJobsContext(db, context, null, startOfMonth),
        fetchLeadsContext(db, context, null, startOfMonth),
        fetchInvoicesContext(db, context, startOfMonth),
        fetchContractorsContext(db, context),
        fetchCampaignsContext(db, context, startOfMonth),
      ]);
    } else if (role === 'sales_rep') {
      // Sales reps see their own leads and jobs
      await Promise.all([
        fetchJobsContext(db, context, userId, startOfMonth),
        fetchLeadsContext(db, context, userId, startOfMonth),
        fetchCommissionsContext(db, context, userId, startOfMonth),
      ]);
    } else if (role === 'pm') {
      // PMs see jobs they manage
      await fetchJobsContextForPM(db, context, userId, startOfMonth);
    } else if (role === 'contractor') {
      // Contractors see their assigned jobs and invoices
      await Promise.all([
        fetchContractorJobsContext(db, context, userId, startOfMonth),
        fetchContractorInvoicesContext(db, context, userId, startOfMonth),
      ]);
    }
  } catch (error) {
    console.error('Error fetching chat context:', error);
    // Return basic context even if data fetching fails
  }

  return context;
}

async function fetchJobsContext(
  db: FirebaseFirestore.Firestore,
  context: ChatContext,
  salesRepId: string | null,
  startOfMonth: Date
): Promise<void> {
  const jobsRef = db.collection('jobs');

  // Build query based on whether we're filtering by sales rep
  let query: FirebaseFirestore.Query = jobsRef;
  if (salesRepId) {
    query = query.where('salesRepId', '==', salesRepId);
  }

  const snapshot = await query.get();
  const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  // Count by status
  const byStatus: Record<string, number> = {};
  let revenueThisMonth = 0;
  const recentJobs: Array<{
    jobNumber: string;
    customer: string;
    status: string;
    value: number;
    type: string;
  }> = [];

  for (const job of jobs) {
    const status = (job as { status?: JobStatus }).status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    // Calculate revenue from jobs completed this month
    const completedAt = (job as { dates?: { actualCompletion?: Timestamp } }).dates?.actualCompletion;
    if (completedAt && completedAt.toDate() >= startOfMonth) {
      const costs = (job as { costs?: { materialActual?: number; laborActual?: number } }).costs;
      const jobValue = (costs?.materialActual || 0) + (costs?.laborActual || 0);
      revenueThisMonth += jobValue;
    }

    // Collect recent jobs (sorted by creation date)
    const createdAt = (job as { createdAt?: Timestamp }).createdAt;
    if (createdAt) {
      const customer = (job as { customer?: { name?: string } }).customer;
      const costs = (job as { costs?: { materialProjected?: number; laborProjected?: number } }).costs;
      const jobValue = (costs?.materialProjected || 0) + (costs?.laborProjected || 0);
      recentJobs.push({
        jobNumber: (job as { jobNumber?: string }).jobNumber || 'N/A',
        customer: customer?.name || 'Unknown',
        status: status,
        value: jobValue,
        type: (job as { type?: string }).type || 'other',
      });
    }
  }

  // Sort and limit recent jobs
  recentJobs.sort((a: { value: number }, b: { value: number }) => b.value - a.value);
  const topJobs = recentJobs.slice(0, 5);

  context.jobs = {
    total: jobs.length,
    byStatus,
    revenueThisMonth,
    revenueMTD: revenueThisMonth,
    recentJobs: topJobs,
  };
}

async function fetchLeadsContext(
  db: FirebaseFirestore.Firestore,
  context: ChatContext,
  assignedTo: string | null,
  startOfMonth: Date
): Promise<void> {
  const leadsRef = db.collection('leads');

  let query: FirebaseFirestore.Query = leadsRef;
  if (assignedTo) {
    query = query.where('assignedTo', '==', assignedTo);
  }

  const snapshot = await query.get();
  const leads = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const byStatus: Record<string, number> = {};
  let thisMonth = 0;
  let convertedCount = 0;
  const recentLeads: Array<{
    name: string;
    source: string;
    status: string;
    quality: string;
  }> = [];

  for (const lead of leads) {
    const status = (lead as { status?: LeadStatus }).status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    if (status === 'converted') {
      convertedCount++;
    }

    const createdAt = (lead as { createdAt?: Timestamp }).createdAt;
    if (createdAt && createdAt.toDate() >= startOfMonth) {
      thisMonth++;
    }

    // Collect recent leads
    const customer = (lead as { customer?: { name?: string } }).customer;
    recentLeads.push({
      name: customer?.name || 'Unknown',
      source: (lead as { source?: string }).source || 'unknown',
      status: status,
      quality: (lead as { quality?: string }).quality || 'unknown',
    });
  }

  // Sort by most recent and limit
  const topLeads = recentLeads.slice(0, 5);

  // Calculate conversion rate
  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 ? (convertedCount / totalLeads) * 100 : 0;

  context.leads = {
    total: totalLeads,
    byStatus,
    thisMonth,
    conversionRate: Math.round(conversionRate * 10) / 10,
    recentLeads: topLeads,
  };
}

async function fetchInvoicesContext(
  db: FirebaseFirestore.Firestore,
  context: ChatContext,
  startOfMonth: Date
): Promise<void> {
  const invoicesRef = db.collection('invoices');
  const snapshot = await invoicesRef.get();
  const invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  let outstanding = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let paidThisMonth = 0;
  const recentInvoices: Array<{
    number: string;
    amount: number;
    status: string;
    dueDate: string;
  }> = [];
  const now = new Date();

  for (const invoice of invoices) {
    const status = (invoice as { status?: InvoiceStatus }).status;
    const total = (invoice as { total?: number }).total || 0;
    const dueDate = (invoice as { dueDate?: Timestamp }).dueDate;
    const paidAt = (invoice as { paidAt?: Timestamp }).paidAt;

    if (status === 'sent' || status === 'overdue') {
      outstanding += total;
    }

    if (dueDate && dueDate.toDate() < now && status !== 'paid') {
      overdueCount++;
      overdueAmount += total;
    }

    if (paidAt && paidAt.toDate() >= startOfMonth) {
      paidThisMonth += total;
    }

    recentInvoices.push({
      number: (invoice as { invoiceNumber?: string }).invoiceNumber || 'N/A',
      amount: total,
      status: status || 'unknown',
      dueDate: dueDate ? dueDate.toDate().toISOString().split('T')[0] : 'N/A',
    });
  }

  // Sort by due date descending and limit
  recentInvoices.sort((a: { amount: number }, b: { amount: number }) => b.amount - a.amount);
  const topInvoices = recentInvoices.slice(0, 5);

  context.invoices = {
    outstanding,
    overdueCount,
    overdueAmount,
    paidThisMonth,
    recentInvoices: topInvoices,
  };
}

async function fetchContractorsContext(
  db: FirebaseFirestore.Firestore,
  context: ChatContext
): Promise<void> {
  const contractorsRef = db.collection('contractors');
  const snapshot = await contractorsRef.get();
  const contractors = snapshot.docs.map(doc => doc.data());

  let active = 0;
  let pending = 0;
  const byTrade: Record<string, number> = {};

  for (const contractor of contractors) {
    const status = (contractor as { status?: string }).status;
    if (status === 'active') {
      active++;
    } else if (status === 'pending') {
      pending++;
    }

    const trades = (contractor as { trades?: string[] }).trades || [];
    for (const trade of trades) {
      byTrade[trade] = (byTrade[trade] || 0) + 1;
    }
  }

  context.contractors = {
    active,
    pending,
    byTrade,
  };
}

async function fetchCampaignsContext(
  db: FirebaseFirestore.Firestore,
  context: ChatContext,
  startOfMonth: Date
): Promise<void> {
  const campaignsRef = db.collection('campaigns');
  const snapshot = await campaignsRef.get();
  const campaigns = snapshot.docs.map(doc => doc.data());

  let activeCampaigns = 0;
  let totalSpend = 0;
  let totalLeads = 0;

  const now = new Date();

  for (const campaign of campaigns) {
    const startDate = (campaign as { startDate?: Timestamp }).startDate;
    const endDate = (campaign as { endDate?: Timestamp | null }).endDate;
    const spend = (campaign as { spend?: number }).spend || 0;
    const leadsGenerated = (campaign as { leadsGenerated?: number }).leadsGenerated || 0;

    // Check if campaign is active
    const isActive = startDate &&
      startDate.toDate() <= now &&
      (!endDate || endDate.toDate() >= now);

    if (isActive) {
      activeCampaigns++;
    }

    // Sum up this month's data
    if (startDate && startDate.toDate() >= startOfMonth) {
      totalSpend += spend;
      totalLeads += leadsGenerated;
    } else if (startDate && startDate.toDate() < startOfMonth) {
      // Include ongoing campaigns
      totalSpend += spend;
      totalLeads += leadsGenerated;
    }
  }

  const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0;

  context.campaigns = {
    active: activeCampaigns,
    totalSpend,
    leadsGenerated: totalLeads,
    avgCPL: Math.round(avgCPL * 100) / 100,
  };
}

async function fetchCommissionsContext(
  db: FirebaseFirestore.Firestore,
  context: ChatContext,
  salesRepId: string,
  startOfMonth: Date
): Promise<void> {
  const jobsRef = db.collection('jobs');
  const snapshot = await jobsRef.where('salesRepId', '==', salesRepId).get();
  const jobs = snapshot.docs.map(doc => doc.data());

  let pendingAmount = 0;
  let paidThisMonth = 0;
  let pendingCount = 0;

  for (const job of jobs) {
    const commission = (job as { commission?: { amount?: number; status?: string; paidAt?: Timestamp } }).commission;
    if (commission) {
      if (commission.status === 'pending' || commission.status === 'approved') {
        pendingAmount += commission.amount || 0;
        pendingCount++;
      }

      if (commission.status === 'paid' && commission.paidAt && commission.paidAt.toDate() >= startOfMonth) {
        paidThisMonth += commission.amount || 0;
      }
    }
  }

  context.commissions = {
    pendingAmount,
    paidThisMonth,
    pendingCount,
  };
}

async function fetchJobsContextForPM(
  db: FirebaseFirestore.Firestore,
  context: ChatContext,
  pmId: string,
  startOfMonth: Date
): Promise<void> {
  const jobsRef = db.collection('jobs');
  const snapshot = await jobsRef.where('pmId', '==', pmId).get();
  const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const byStatus: Record<string, number> = {};
  let revenueThisMonth = 0;
  const recentJobs: Array<{
    jobNumber: string;
    customer: string;
    status: string;
    value: number;
    type: string;
  }> = [];

  for (const job of jobs) {
    const status = (job as { status?: JobStatus }).status || 'unknown';
    byStatus[status] = (byStatus[status] || 0) + 1;

    const completedAt = (job as { dates?: { actualCompletion?: Timestamp } }).dates?.actualCompletion;
    if (completedAt && completedAt.toDate() >= startOfMonth) {
      const costs = (job as { costs?: { materialActual?: number; laborActual?: number } }).costs;
      const jobValue = (costs?.materialActual || 0) + (costs?.laborActual || 0);
      revenueThisMonth += jobValue;
    }

    const customer = (job as { customer?: { name?: string } }).customer;
    const costs = (job as { costs?: { materialProjected?: number; laborProjected?: number } }).costs;
    const jobValue = (costs?.materialProjected || 0) + (costs?.laborProjected || 0);

    recentJobs.push({
      jobNumber: (job as { jobNumber?: string }).jobNumber || 'N/A',
      customer: customer?.name || 'Unknown',
      status: status,
      value: jobValue,
      type: (job as { type?: string }).type || 'other',
    });
  }

  recentJobs.sort((a: { value: number }, b: { value: number }) => b.value - a.value);
  const topJobs = recentJobs.slice(0, 5);

  context.jobs = {
    total: jobs.length,
    byStatus,
    revenueThisMonth,
    revenueMTD: revenueThisMonth,
    recentJobs: topJobs,
  };
}

async function fetchContractorJobsContext(
  db: FirebaseFirestore.Firestore,
  context: ChatContext,
  contractorUserId: string,
  startOfMonth: Date
): Promise<void> {
  // First, find the contractor record for this user
  const contractorsRef = db.collection('contractors');
  const contractorSnapshot = await contractorsRef.where('userId', '==', contractorUserId).limit(1).get();

  if (contractorSnapshot.empty) {
    context.myJobs = {
      assigned: 0,
      inProgress: 0,
      completedThisMonth: 0,
      upcomingJobs: [],
    };
    return;
  }

  const contractorId = contractorSnapshot.docs[0].id;

  // Find jobs where this contractor is in the crew
  const jobsRef = db.collection('jobs');
  const snapshot = await jobsRef.where('crewIds', 'array-contains', contractorId).get();
  const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  let assigned = 0;
  let inProgress = 0;
  let completedThisMonth = 0;
  const upcomingJobs: Array<{
    jobNumber: string;
    customer: string;
    scheduledDate: string | null;
    type: string;
  }> = [];

  for (const job of jobs) {
    const status = (job as { status?: JobStatus }).status;

    if (status && ['scheduled', 'production', 'front_end_hold', 'sold'].includes(status)) {
      assigned++;
    }

    if (status === 'started') {
      inProgress++;
    }

    const completedAt = (job as { dates?: { actualCompletion?: Timestamp } }).dates?.actualCompletion;
    if (completedAt && completedAt.toDate() >= startOfMonth) {
      completedThisMonth++;
    }

    // Collect upcoming scheduled jobs
    const scheduledStart = (job as { dates?: { scheduledStart?: Timestamp } }).dates?.scheduledStart;
    if (scheduledStart && scheduledStart.toDate() >= new Date()) {
      const customer = (job as { customer?: { name?: string } }).customer;
      upcomingJobs.push({
        jobNumber: (job as { jobNumber?: string }).jobNumber || 'N/A',
        customer: customer?.name || 'Unknown',
        scheduledDate: scheduledStart.toDate().toISOString().split('T')[0],
        type: (job as { type?: string }).type || 'other',
      });
    }
  }

  // Sort upcoming jobs by date
  upcomingJobs.sort((a: { scheduledDate: string | null }, b: { scheduledDate: string | null }) => {
    if (!a.scheduledDate) return 1;
    if (!b.scheduledDate) return -1;
    return a.scheduledDate.localeCompare(b.scheduledDate);
  });

  context.myJobs = {
    assigned,
    inProgress,
    completedThisMonth,
    upcomingJobs: upcomingJobs.slice(0, 5),
  };
}

async function fetchContractorInvoicesContext(
  db: FirebaseFirestore.Firestore,
  context: ChatContext,
  contractorUserId: string,
  startOfMonth: Date
): Promise<void> {
  // First, find the contractor record for this user
  const contractorsRef = db.collection('contractors');
  const contractorSnapshot = await contractorsRef.where('userId', '==', contractorUserId).limit(1).get();

  if (contractorSnapshot.empty) {
    context.myInvoices = {
      pending: 0,
      pendingAmount: 0,
      paidThisMonth: 0,
    };
    return;
  }

  const contractorId = contractorSnapshot.docs[0].id;

  // Find invoices from this contractor
  const invoicesRef = db.collection('invoices');
  const snapshot = await invoicesRef.where('from.contractorId', '==', contractorId).get();
  const invoices = snapshot.docs.map(doc => doc.data());

  let pending = 0;
  let pendingAmount = 0;
  let paidThisMonth = 0;

  for (const invoice of invoices) {
    const status = (invoice as { status?: InvoiceStatus }).status;
    const total = (invoice as { total?: number }).total || 0;
    const paidAt = (invoice as { paidAt?: Timestamp }).paidAt;

    if (status === 'sent' || status === 'draft') {
      pending++;
      pendingAmount += total;
    }

    if (paidAt && paidAt.toDate() >= startOfMonth) {
      paidThisMonth += total;
    }
  }

  context.myInvoices = {
    pending,
    pendingAmount,
    paidThisMonth,
  };
}

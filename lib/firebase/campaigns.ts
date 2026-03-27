import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { Campaign, CampaignPlatform, Lead } from '@/types/lead';
import { Job } from '@/types/job';
import {
  CampaignMetrics,
  calculateFullCampaignMetrics,
  calculateCampaignROI,
} from '@/lib/utils/campaignMetrics';

const COLLECTION = 'campaigns';

export interface CampaignFilters {
  platform?: CampaignPlatform;
  market?: string;
  trade?: string;
  search?: string;
}

export async function getCampaigns(filters?: CampaignFilters): Promise<Campaign[]> {
  const constraints: QueryConstraint[] = [orderBy('startDate', 'desc')];

  if (filters?.platform) {
    constraints.unshift(where('platform', '==', filters.platform));
  }

  if (filters?.market) {
    constraints.unshift(where('market', '==', filters.market));
  }

  if (filters?.trade) {
    constraints.unshift(where('trade', '==', filters.trade));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let campaigns = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Campaign[];

  // Client-side search filter
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    campaigns = campaigns.filter((campaign) =>
      campaign.name.toLowerCase().includes(searchLower)
    );
  }

  return campaigns;
}

export async function getCampaign(id: string): Promise<Campaign | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Campaign;
  }

  return null;
}

export async function createCampaign(
  data: Omit<Campaign, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    leadsGenerated: 0,
    spend: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateCampaign(
  id: string,
  data: Partial<Omit<Campaign, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCampaign(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export async function updateCampaignSpend(
  id: string,
  spend: number
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    spend,
    updatedAt: serverTimestamp(),
  });
}

export async function incrementLeadsGenerated(id: string): Promise<void> {
  const campaign = await getCampaign(id);
  if (campaign) {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      leadsGenerated: campaign.leadsGenerated + 1,
      updatedAt: serverTimestamp(),
    });
  }
}

export function subscribeToCampaigns(
  callback: (campaigns: Campaign[]) => void,
  filters?: CampaignFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('startDate', 'desc')];

  if (filters?.platform) {
    constraints.unshift(where('platform', '==', filters.platform));
  }

  if (filters?.market) {
    constraints.unshift(where('market', '==', filters.market));
  }

  if (filters?.trade) {
    constraints.unshift(where('trade', '==', filters.trade));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let campaigns = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Campaign[];

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      campaigns = campaigns.filter((campaign) =>
        campaign.name.toLowerCase().includes(searchLower)
      );
    }

    callback(campaigns);
  });
}

export function subscribeToCampaign(
  id: string,
  callback: (campaign: Campaign | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Campaign);
    } else {
      callback(null);
    }
  });
}

// Calculate campaign metrics (basic - without lead/job data)
export function calculateCampaignMetrics(campaign: Campaign): {
  cpl: number;
  roi: number | null;
} {
  const cpl = campaign.leadsGenerated > 0 ? campaign.spend / campaign.leadsGenerated : 0;
  // If we have cached revenue data on the campaign, calculate ROI
  const revenue = campaign.revenueAttributed ?? 0;
  const roi = revenue > 0 ? calculateCampaignROI(campaign.spend, revenue) : null;
  return { cpl, roi };
}

// Fetch campaign with full metrics (campaign + related leads + related jobs in parallel)
export async function getCampaignWithMetrics(
  id: string
): Promise<{ campaign: Campaign; metrics: CampaignMetrics } | null> {
  const campaign = await getCampaign(id);
  if (!campaign) return null;

  // Fetch leads for this campaign
  const leadsQuery = query(
    collection(db, 'leads'),
    where('campaignId', '==', id)
  );
  const leadsSnapshot = await getDocs(leadsQuery);
  const leads = leadsSnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Lead[];

  // Collect linked job IDs from converted leads
  const linkedJobIds = leads
    .filter((l) => l.linkedJobId)
    .map((l) => l.linkedJobId as string);

  // Fetch linked jobs in parallel (Firestore 'in' queries limited to 30 items)
  let jobs: Job[] = [];
  if (linkedJobIds.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < linkedJobIds.length; i += 30) {
      chunks.push(linkedJobIds.slice(i, i + 30));
    }
    const jobPromises = chunks.map((chunk) =>
      getDocs(query(collection(db, 'jobs'), where('__name__', 'in', chunk)))
    );
    const jobSnapshots = await Promise.all(jobPromises);
    jobs = jobSnapshots.flatMap((snap) =>
      snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Job)
    );
  }

  const metrics = calculateFullCampaignMetrics(campaign, leads, jobs);
  return { campaign, metrics };
}

// Fetch metrics for all campaigns (batch)
export async function getAllCampaignMetrics(
  campaigns: Campaign[]
): Promise<Map<string, CampaignMetrics>> {
  const metricsMap = new Map<string, CampaignMetrics>();
  if (campaigns.length === 0) return metricsMap;

  // Fetch all leads that belong to any of these campaigns
  const campaignIds = campaigns.map((c) => c.id);
  const allLeads: Lead[] = [];

  // Firestore 'in' queries are limited to 30 items
  for (let i = 0; i < campaignIds.length; i += 30) {
    const chunk = campaignIds.slice(i, i + 30);
    const leadsQuery = query(
      collection(db, 'leads'),
      where('campaignId', 'in', chunk)
    );
    const snap = await getDocs(leadsQuery);
    allLeads.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Lead));
  }

  // Collect all linked job IDs
  const linkedJobIds = allLeads
    .filter((l) => l.linkedJobId)
    .map((l) => l.linkedJobId as string);
  const uniqueJobIds = Array.from(new Set(linkedJobIds));

  // Fetch all linked jobs
  let allJobs: Job[] = [];
  if (uniqueJobIds.length > 0) {
    for (let i = 0; i < uniqueJobIds.length; i += 30) {
      const chunk = uniqueJobIds.slice(i, i + 30);
      const snap = await getDocs(
        query(collection(db, 'jobs'), where('__name__', 'in', chunk))
      );
      allJobs.push(...snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Job));
    }
  }

  // Group leads by campaign
  const leadsByCampaign = new Map<string, Lead[]>();
  for (const lead of allLeads) {
    if (lead.campaignId) {
      const existing = leadsByCampaign.get(lead.campaignId) || [];
      existing.push(lead);
      leadsByCampaign.set(lead.campaignId, existing);
    }
  }

  // Calculate metrics per campaign
  for (const campaign of campaigns) {
    const campaignLeads = leadsByCampaign.get(campaign.id) || [];
    const metrics = calculateFullCampaignMetrics(campaign, campaignLeads, allJobs);
    metricsMap.set(campaign.id, metrics);
  }

  return metricsMap;
}

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
import { Campaign, CampaignPlatform } from '@/types/lead';

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

// Calculate campaign metrics
export function calculateCampaignMetrics(campaign: Campaign): {
  cpl: number;
  roi: number | null;
} {
  const cpl = campaign.leadsGenerated > 0 ? campaign.spend / campaign.leadsGenerated : 0;
  // ROI calculation would require revenue data which isn't tracked yet
  return { cpl, roi: null };
}

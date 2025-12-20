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
import { Subscription, SubscriptionTier, SubscriptionStatus } from '@/types/lead';

const COLLECTION = 'subscriptions';

export interface SubscriptionFilters {
  tier?: SubscriptionTier;
  status?: SubscriptionStatus;
  search?: string;
}

export async function getSubscriptions(filters?: SubscriptionFilters): Promise<Subscription[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.tier) {
    constraints.unshift(where('tier', '==', filters.tier));
  }

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  const subscriptions = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Subscription[];

  return subscriptions;
}

export async function getSubscription(id: string): Promise<Subscription | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Subscription;
  }

  return null;
}

export async function getSubscriptionByUser(userId: string): Promise<Subscription | null> {
  const q = query(collection(db, COLLECTION), where('userId', '==', userId));
  const snapshot = await getDocs(q);

  if (snapshot.docs.length > 0) {
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as Subscription;
  }

  return null;
}

export async function createSubscription(
  data: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateSubscription(
  id: string,
  data: Partial<Omit<Subscription, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSubscription(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export async function pauseSubscription(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'paused',
    updatedAt: serverTimestamp(),
  });
}

export async function resumeSubscription(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
}

export async function cancelSubscription(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToSubscriptions(
  callback: (subscriptions: Subscription[]) => void,
  filters?: SubscriptionFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.tier) {
    constraints.unshift(where('tier', '==', filters.tier));
  }

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    const subscriptions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Subscription[];

    callback(subscriptions);
  });
}

export function subscribeToSubscription(
  id: string,
  callback: (subscription: Subscription | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Subscription);
    } else {
      callback(null);
    }
  });
}

// Get subscription counts by tier
export async function getSubscriptionCountsByTier(): Promise<Record<SubscriptionTier, number>> {
  const q = query(collection(db, COLLECTION), where('status', '==', 'active'));
  const snapshot = await getDocs(q);

  const counts: Record<SubscriptionTier, number> = {
    starter: 0,
    growth: 0,
    pro: 0,
  };

  snapshot.docs.forEach((doc) => {
    const tier = doc.data().tier as SubscriptionTier;
    if (tier in counts) {
      counts[tier]++;
    }
  });

  return counts;
}

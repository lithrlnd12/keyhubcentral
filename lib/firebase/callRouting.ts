import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { RoutingRule } from '@/types/callCenter';
import { Lead } from '@/types/lead';

const COLLECTION = 'routingRules';

/**
 * Get all routing rules ordered by priority
 */
export async function getRoutingRules(): Promise<RoutingRule[]> {
  const q = query(collection(db, COLLECTION), orderBy('priority', 'asc'));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as RoutingRule[];
}

/**
 * Create a new routing rule
 */
export async function createRoutingRule(
  data: Omit<RoutingRule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an existing routing rule
 */
export async function updateRoutingRule(
  id: string,
  data: Partial<Omit<RoutingRule, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a routing rule
 */
export async function deleteRoutingRule(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Find the first matching routing rule for a lead.
 * Iterates rules by priority (ascending), returns the first rule
 * where all non-null/undefined conditions match the lead fields.
 */
export async function findMatchingRule(lead: Lead): Promise<RoutingRule | null> {
  const rules = await getRoutingRules();

  for (const rule of rules) {
    if (!rule.active) continue;

    const { conditions } = rule;
    let matches = true;

    if (conditions.trade && conditions.trade !== lead.trade) {
      matches = false;
    }

    if (conditions.market && conditions.market !== lead.market) {
      matches = false;
    }

    if (conditions.source && conditions.source !== lead.source) {
      matches = false;
    }

    if (conditions.quality && conditions.quality !== lead.quality) {
      matches = false;
    }

    if (matches) {
      return rule;
    }
  }

  return null;
}

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { ApiKey } from '@/types/webhook';

const API_KEYS_COLLECTION = 'apiKeys';

/**
 * Hash a string with SHA-256 using the Web Crypto API (works in both browser and server)
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Create a new API key.
 * Returns the full plaintext key — this is the ONLY time it will be visible.
 */
export async function createApiKey(
  name: string,
  createdBy: string
): Promise<{ apiKey: ApiKey; fullKey: string }> {
  const rawKey = crypto.randomUUID();
  const fullKey = `khc_${rawKey}`;
  const keyHash = await sha256(fullKey);
  const keyPrefix = fullKey.substring(0, 12) + '...';

  const docRef = await addDoc(collection(db, API_KEYS_COLLECTION), {
    name,
    keyHash,
    keyPrefix,
    permissions: ['read'],
    createdBy,
    lastUsedAt: null,
    createdAt: serverTimestamp(),
  });

  const apiKey: ApiKey = {
    id: docRef.id,
    name,
    keyHash,
    keyPrefix,
    permissions: ['read'],
    createdBy,
    lastUsedAt: null,
  } as ApiKey;

  return { apiKey, fullKey };
}

/**
 * Get all API keys (returns prefix, never full key)
 */
export async function getApiKeys(): Promise<ApiKey[]> {
  const q = query(
    collection(db, API_KEYS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as ApiKey[];
}

/**
 * Delete an API key
 */
export async function deleteApiKey(id: string): Promise<void> {
  const docRef = doc(db, API_KEYS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Validate an API key by hashing the provided key and matching against stored hashes.
 * Updates lastUsedAt on successful validation.
 * Returns the matching ApiKey record or null.
 */
export async function validateApiKey(key: string): Promise<ApiKey | null> {
  const keyHash = await sha256(key);

  const q = query(
    collection(db, API_KEYS_COLLECTION),
    where('keyHash', '==', keyHash)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) return null;

  const matchDoc = snapshot.docs[0];

  // Update lastUsedAt
  await updateDoc(matchDoc.ref, {
    lastUsedAt: serverTimestamp(),
  });

  return { id: matchDoc.id, ...matchDoc.data() } as ApiKey;
}

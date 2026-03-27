import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { WebhookEndpoint, WebhookDelivery, WebhookEvent } from '@/types/webhook';

const ENDPOINTS_COLLECTION = 'webhookEndpoints';
const DELIVERIES_COLLECTION = 'webhookDeliveries';

/**
 * Validate that a webhook URL is HTTPS (allow HTTP only for localhost)
 */
function validateWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Create a new webhook endpoint with a generated signing secret
 */
export async function createWebhookEndpoint(data: {
  name: string;
  url: string;
  events: WebhookEvent[];
  createdBy: string;
}): Promise<{ endpoint: WebhookEndpoint; secret: string }> {
  if (!validateWebhookUrl(data.url)) {
    throw new Error('Webhook URL must use HTTPS (HTTP is only allowed for localhost)');
  }

  const secret = crypto.randomUUID();

  const docRef = await addDoc(collection(db, ENDPOINTS_COLLECTION), {
    name: data.name,
    url: data.url,
    events: data.events,
    secret,
    active: true,
    createdBy: data.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const newDoc = await getDoc(docRef);
  const endpoint = { id: newDoc.id, ...newDoc.data() } as WebhookEndpoint;

  return { endpoint, secret };
}

/**
 * Get all webhook endpoints
 */
export async function getWebhookEndpoints(): Promise<WebhookEndpoint[]> {
  const q = query(
    collection(db, ENDPOINTS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as WebhookEndpoint[];
}

/**
 * Update a webhook endpoint
 */
export async function updateWebhookEndpoint(
  id: string,
  data: Partial<Pick<WebhookEndpoint, 'name' | 'url' | 'events' | 'active'>>
): Promise<void> {
  if (data.url && !validateWebhookUrl(data.url)) {
    throw new Error('Webhook URL must use HTTPS (HTTP is only allowed for localhost)');
  }

  const docRef = doc(db, ENDPOINTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a webhook endpoint
 */
export async function deleteWebhookEndpoint(id: string): Promise<void> {
  const docRef = doc(db, ENDPOINTS_COLLECTION, id);
  await deleteDoc(docRef);
}

/**
 * Get recent webhook deliveries for an endpoint
 */
export async function getWebhookDeliveries(
  endpointId: string,
  deliveryLimit: number = 20
): Promise<WebhookDelivery[]> {
  const q = query(
    collection(db, DELIVERIES_COLLECTION),
    where('endpointId', '==', endpointId),
    orderBy('createdAt', 'desc'),
    firestoreLimit(deliveryLimit)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as WebhookDelivery[];
}

/**
 * Log a webhook delivery attempt
 */
export async function createWebhookDelivery(
  delivery: Omit<WebhookDelivery, 'id' | 'createdAt' | 'lastAttemptAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, DELIVERIES_COLLECTION), {
    ...delivery,
    lastAttemptAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

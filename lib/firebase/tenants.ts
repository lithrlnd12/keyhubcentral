import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { TenantPortalConfig } from '@/types/tenant-portal';

const TENANTS_COLLECTION = 'tenants';

// Get tenant by slug (for portal routing)
export async function getTenantBySlug(slug: string): Promise<TenantPortalConfig | null> {
  const q = query(
    collection(db, TENANTS_COLLECTION),
    where('slug', '==', slug),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as TenantPortalConfig;
}

// Get tenant by ID
export async function getTenant(id: string): Promise<TenantPortalConfig | null> {
  const docRef = doc(db, TENANTS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as TenantPortalConfig;
}

// Get tenant by owner ID (for admin managing their portal)
export async function getTenantByOwner(ownerId: string): Promise<TenantPortalConfig | null> {
  const q = query(
    collection(db, TENANTS_COLLECTION),
    where('ownerId', '==', ownerId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as TenantPortalConfig;
}

// Create a new tenant portal
export async function createTenant(
  data: Omit<TenantPortalConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = doc(collection(db, TENANTS_COLLECTION));
  await setDoc(docRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// Update tenant configuration
export async function updateTenant(
  id: string,
  data: Partial<Omit<TenantPortalConfig, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, TENANTS_COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Get jobs for a customer email within a tenant's scope
// Jobs belong to the tenant owner (salesRepId or crewIds contain the owner)
export async function getCustomerJobsByEmail(customerEmail: string, tenantOwnerId?: string) {
  const { getJobs } = await import('./jobs');
  const allJobs = await getJobs();

  // Filter to jobs matching this customer's email
  let jobs = allJobs.filter(
    (job) => job.customer?.email?.toLowerCase() === customerEmail.toLowerCase()
  );

  // If tenant owner specified, only show jobs they're associated with
  // (In the future, you might want a tenantId field on jobs directly)
  if (tenantOwnerId) {
    jobs = jobs.filter(
      (job) =>
        job.salesRepId === tenantOwnerId ||
        job.crewIds?.includes(tenantOwnerId) ||
        job.pmId === tenantOwnerId
    );
  }

  return jobs;
}

// Get leads for a customer email
export async function getCustomerLeadsByEmail(customerEmail: string) {
  const { getLeads } = await import('./leads');
  const allLeads = await getLeads();
  return allLeads.filter(
    (lead) => lead.customer?.email?.toLowerCase() === customerEmail.toLowerCase()
  );
}

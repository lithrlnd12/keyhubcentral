import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import {
  Network,
  ConnectionRequest,
  TenantNetworkConfig,
  DEFAULT_NETWORK_CONFIG,
} from '@/types/network';

// ── Tenant Network Config (config/network doc) ─────────────────────────────

/**
 * Get the current tenant's network configuration.
 */
export async function getNetworkConfig(): Promise<TenantNetworkConfig> {
  const ref = doc(db, 'config', 'network');
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return snap.data() as TenantNetworkConfig;
  }
  return DEFAULT_NETWORK_CONFIG;
}

/**
 * Update the current tenant's network configuration.
 */
export async function updateNetworkConfig(
  config: Partial<TenantNetworkConfig>
): Promise<void> {
  const ref = doc(db, 'config', 'network');
  const existing = await getDoc(ref);
  if (existing.exists()) {
    await updateDoc(ref, config);
  } else {
    await setDoc(ref, { ...DEFAULT_NETWORK_CONFIG, ...config });
  }
}

/**
 * Real-time subscription to network config.
 */
export function subscribeToNetworkConfig(
  callback: (config: TenantNetworkConfig) => void
): () => void {
  const ref = doc(db, 'config', 'network');
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as TenantNetworkConfig);
      } else {
        callback(DEFAULT_NETWORK_CONFIG);
      }
    },
    (error) => {
      console.error('Error subscribing to network config:', error);
      callback(DEFAULT_NETWORK_CONFIG);
    }
  );
}

// ── Networks Collection ─────────────────────────────────────────────────────

/**
 * Create a new network.
 */
export async function createNetwork(
  name: string,
  tenantId: string,
  sharedFeatures: Network['sharedFeatures']
): Promise<string> {
  const docRef = await addDoc(collection(db, 'networks'), {
    name,
    tenants: [tenantId],
    sharedFeatures,
    status: 'active',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get a network by ID.
 */
export async function getNetwork(networkId: string): Promise<Network | null> {
  const snap = await getDoc(doc(db, 'networks', networkId));
  if (snap.exists()) {
    return { id: snap.id, ...snap.data() } as Network;
  }
  return null;
}

/**
 * Get networks that include a specific tenant.
 */
export async function getNetworksForTenant(tenantId: string): Promise<Network[]> {
  const q = query(
    collection(db, 'networks'),
    where('tenants', 'array-contains', tenantId),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Network));
}

/**
 * Add a tenant to a network.
 */
export async function addTenantToNetwork(
  networkId: string,
  tenantId: string
): Promise<void> {
  const ref = doc(db, 'networks', networkId);
  await updateDoc(ref, {
    tenants: arrayUnion(tenantId),
  });
}

/**
 * Remove a tenant from a network.
 */
export async function removeTenantFromNetwork(
  networkId: string,
  tenantId: string
): Promise<void> {
  const ref = doc(db, 'networks', networkId);
  await updateDoc(ref, {
    tenants: arrayRemove(tenantId),
  });
}

/**
 * Real-time subscription to networks for a tenant.
 */
export function subscribeToNetworks(
  tenantId: string,
  callback: (networks: Network[]) => void
): () => void {
  const q = query(
    collection(db, 'networks'),
    where('tenants', 'array-contains', tenantId),
    where('status', '==', 'active')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const networks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Network));
      callback(networks);
    },
    (error) => {
      console.error('Error subscribing to networks:', error);
      callback([]);
    }
  );
}

// ── Connection Requests ─────────────────────────────────────────────────────

/**
 * Send a connection request to another tenant.
 */
export async function sendConnectionRequest(
  networkId: string,
  fromTenantId: string,
  toTenantId: string,
  message?: string
): Promise<string> {
  const docRef = await addDoc(collection(db, 'connectionRequests'), {
    networkId,
    fromTenantId,
    toTenantId,
    status: 'pending',
    message: message || '',
    createdAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Get pending connection requests for a tenant (inbound).
 */
export async function getInboundRequests(tenantId: string): Promise<ConnectionRequest[]> {
  const q = query(
    collection(db, 'connectionRequests'),
    where('toTenantId', '==', tenantId),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ConnectionRequest));
}

/**
 * Get outbound connection requests from a tenant.
 */
export async function getOutboundRequests(tenantId: string): Promise<ConnectionRequest[]> {
  const q = query(
    collection(db, 'connectionRequests'),
    where('fromTenantId', '==', tenantId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as ConnectionRequest));
}

/**
 * Accept a connection request — adds the requesting tenant to the network.
 */
export async function acceptConnectionRequest(requestId: string): Promise<void> {
  const ref = doc(db, 'connectionRequests', requestId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Request not found');

  const request = snap.data() as ConnectionRequest;

  // Add the requesting tenant to the network
  await addTenantToNetwork(request.networkId, request.fromTenantId);

  // Mark request as accepted
  await updateDoc(ref, {
    status: 'accepted',
    respondedAt: serverTimestamp(),
  });
}

/**
 * Reject a connection request.
 */
export async function rejectConnectionRequest(requestId: string): Promise<void> {
  const ref = doc(db, 'connectionRequests', requestId);
  await updateDoc(ref, {
    status: 'rejected',
    respondedAt: serverTimestamp(),
  });
}

// ── Contractor Network Opt-In ───────────────────────────────────────────────

/**
 * Add a contractor to a network (opt-in).
 */
export async function addContractorToNetwork(
  contractorId: string,
  networkId: string
): Promise<void> {
  const ref = doc(db, 'contractors', contractorId);
  await updateDoc(ref, {
    sharedNetworks: arrayUnion(networkId),
  });
}

/**
 * Remove a contractor from a network (opt-out).
 */
export async function removeContractorFromNetwork(
  contractorId: string,
  networkId: string
): Promise<void> {
  const ref = doc(db, 'contractors', contractorId);
  await updateDoc(ref, {
    sharedNetworks: arrayRemove(networkId),
  });
}

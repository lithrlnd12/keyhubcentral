import { Timestamp } from 'firebase/firestore';

// ── KeyHub Network ──────────────────────────────────────────────────────────
// Allows separate white-labeled tenant instances to optionally connect and
// share contractors and labor marketplace listings — without sharing any
// customer data, job details, financials, or private communications.

export type NetworkStatus = 'active' | 'pending';

export interface NetworkSharedFeatures {
  contractors: boolean;   // share contractor availability
  marketplace: boolean;   // share labor marketplace listings
}

export interface Network {
  id: string;
  name: string;
  tenants: string[];              // array of tenantIds in this network
  sharedFeatures: NetworkSharedFeatures;
  status: NetworkStatus;
  createdAt: Timestamp;
}

// ── Connection Requests ─────────────────────────────────────────────────────
// Both tenants must agree before joining the same network.

export type ConnectionRequestStatus = 'pending' | 'accepted' | 'rejected';

export interface ConnectionRequest {
  id: string;
  networkId: string;
  fromTenantId: string;
  toTenantId: string;
  status: ConnectionRequestStatus;
  message?: string;
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}

// ── Tenant Network Config ───────────────────────────────────────────────────
// Stored in config/network doc per tenant. Controls what this tenant shares
// and pulls from the network.

export interface TenantNetworkConfig {
  enabled: boolean;
  networkId?: string;
  share: {
    contractors: boolean;    // share available contractors to network
    marketplace: boolean;    // share marketplace listings to network
  };
  pull: {
    contractors: boolean;    // pull available contractors from network
    marketplace: boolean;    // pull open labor requests from network
  };
  connectedMembersCount?: number;
}

export const DEFAULT_NETWORK_CONFIG: TenantNetworkConfig = {
  enabled: false,
  share: {
    contractors: false,
    marketplace: false,
  },
  pull: {
    contractors: false,
    marketplace: false,
  },
};

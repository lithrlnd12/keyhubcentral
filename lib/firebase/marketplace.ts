import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import {
  MarketplaceListing,
  MarketplaceBid,
  MarketplaceFilters,
} from '@/types/marketplace';

const COLLECTION = 'marketplaceListings';

/**
 * Create a new marketplace listing with a 7-day default expiry.
 * Optionally includes networkId and sourceTenantId for network sharing.
 */
export async function createListing(
  data: Omit<MarketplaceListing, 'id' | 'status' | 'bids' | 'acceptedBidId' | 'expiresAt' | 'createdAt' | 'updatedAt'>,
  networkOptions?: { networkId: string; sourceTenantId: string }
): Promise<string> {
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  );

  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    status: 'open',
    bids: [],
    acceptedBidId: null,
    ...(networkOptions ? { networkId: networkOptions.networkId, sourceTenantId: networkOptions.sourceTenantId } : {}),
    expiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Get all open listings, optionally filtered by trade and/or location.
 * When networkIds are provided, also includes network-scoped listings
 * (but strips sourceTenantId before returning).
 */
export async function getOpenListings(
  filters?: MarketplaceFilters,
  networkIds?: string[]
): Promise<MarketplaceListing[]> {
  const constraints: QueryConstraint[] = [
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc'),
  ];

  if (filters?.trade) {
    constraints.unshift(where('trade', '==', filters.trade));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let listings = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MarketplaceListing[];

  // If network sharing is active, include network-scoped listings
  // but filter to only those with a matching networkId
  if (networkIds && networkIds.length > 0) {
    listings = listings.filter((l) =>
      // Local listings (no networkId) always show
      !l.networkId ||
      // Network listings only if they match one of our networks
      networkIds.includes(l.networkId)
    );
  } else {
    // No network — only show local listings (no networkId)
    listings = listings.filter((l) => !l.networkId);
  }

  // Strip sourceTenantId from results — never exposed to UI
  listings = listings.map((l) => {
    if (l.sourceTenantId) {
      const { sourceTenantId: _, ...rest } = l;
      return rest as MarketplaceListing;
    }
    return l;
  });

  // Client-side filters
  listings = applyClientFilters(listings, filters);

  return listings;
}

/**
 * Get a dealer's own listings.
 */
export async function getMyListings(dealerId: string): Promise<MarketplaceListing[]> {
  const q = query(
    collection(db, COLLECTION),
    where('dealerId', '==', dealerId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MarketplaceListing[];
}

/**
 * Get listings matching a contractor's trades.
 * Optionally filter by contractor location for distance.
 * When networkIds are provided, includes network-scoped listings.
 */
export async function getListingsForContractor(
  contractorId: string,
  trades: string[],
  _location?: { lat: number; lng: number },
  networkIds?: string[]
): Promise<MarketplaceListing[]> {
  // Firestore array-contains only supports a single value,
  // so we query for 'open' status and filter trades client-side
  const q = query(
    collection(db, COLLECTION),
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  let listings = snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  })) as MarketplaceListing[];

  // Filter by network scope
  if (networkIds && networkIds.length > 0) {
    listings = listings.filter((l) =>
      !l.networkId || networkIds.includes(l.networkId)
    );
  } else {
    listings = listings.filter((l) => !l.networkId);
  }

  // Strip sourceTenantId — never exposed to UI
  listings = listings.map((l) => {
    if (l.sourceTenantId) {
      const { sourceTenantId: _, ...rest } = l;
      return rest as MarketplaceListing;
    }
    return l;
  });

  // Filter by contractor's trades
  if (trades.length > 0) {
    listings = listings.filter((l) => trades.includes(l.trade));
  }

  return listings;
}

/**
 * Place a bid on a listing. Adds bid to the listing's bids array.
 */
export async function placeBid(
  listingId: string,
  bid: Omit<MarketplaceBid, 'id' | 'status' | 'bidAt'>
): Promise<void> {
  const listing = await getListing(listingId);
  if (!listing) throw new Error('Listing not found');
  if (listing.status !== 'open') throw new Error('Listing is no longer open for bids');

  // Check if contractor already placed a bid
  const existingBid = listing.bids.find((b) => b.contractorId === bid.contractorId);
  if (existingBid) throw new Error('You have already bid on this listing');

  const newBid: MarketplaceBid = {
    ...bid,
    id: generateBidId(),
    status: 'pending',
    bidAt: Timestamp.now(),
  };

  const docRef = doc(db, COLLECTION, listingId);
  await updateDoc(docRef, {
    bids: [...listing.bids, newBid],
    updatedAt: serverTimestamp(),
  });
}

/**
 * Accept a bid — marks that bid as accepted and listing as 'claimed'.
 */
export async function acceptBid(
  listingId: string,
  bidId: string
): Promise<void> {
  const listing = await getListing(listingId);
  if (!listing) throw new Error('Listing not found');

  const updatedBids = listing.bids.map((b) => ({
    ...b,
    status: b.id === bidId ? ('accepted' as const) : b.status === 'pending' ? ('rejected' as const) : b.status,
  }));

  const docRef = doc(db, COLLECTION, listingId);
  await updateDoc(docRef, {
    status: 'claimed',
    acceptedBidId: bidId,
    bids: updatedBids,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Reject a specific bid on a listing.
 */
export async function rejectBid(
  listingId: string,
  bidId: string
): Promise<void> {
  const listing = await getListing(listingId);
  if (!listing) throw new Error('Listing not found');

  const updatedBids = listing.bids.map((b) => ({
    ...b,
    status: b.id === bidId ? ('rejected' as const) : b.status,
  }));

  const docRef = doc(db, COLLECTION, listingId);
  await updateDoc(docRef, {
    bids: updatedBids,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cancel a listing.
 */
export async function cancelListing(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    status: 'cancelled',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Real-time subscription to open listings with optional filters.
 * When networkIds are provided, includes network-scoped listings.
 */
export function subscribeToOpenListings(
  callback: (listings: MarketplaceListing[]) => void,
  filters?: MarketplaceFilters,
  networkIds?: string[]
): () => void {
  const constraints: QueryConstraint[] = [
    where('status', '==', 'open'),
    orderBy('createdAt', 'desc'),
  ];

  if (filters?.trade) {
    constraints.unshift(where('trade', '==', filters.trade));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(
    q,
    (snapshot) => {
      let listings = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MarketplaceListing[];

      // Filter by network scope
      if (networkIds && networkIds.length > 0) {
        listings = listings.filter((l) =>
          !l.networkId || networkIds.includes(l.networkId)
        );
      } else {
        listings = listings.filter((l) => !l.networkId);
      }

      // Strip sourceTenantId — never exposed to UI
      listings = listings.map((l) => {
        if (l.sourceTenantId) {
          const { sourceTenantId: _, ...rest } = l;
          return rest as MarketplaceListing;
        }
        return l;
      });

      listings = applyClientFilters(listings, filters);
      callback(listings);
    },
    (error) => {
      console.error('Error in marketplace listings listener:', error);
      callback([]);
    }
  );
}

/**
 * Real-time subscription to a dealer's own listings.
 */
export function subscribeToMyListings(
  dealerId: string,
  callback: (listings: MarketplaceListing[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('dealerId', '==', dealerId),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const listings = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as MarketplaceListing[];
      callback(listings);
    },
    (error) => {
      console.error('Error in my listings listener:', error);
      callback([]);
    }
  );
}

// --- Helpers ---

async function getListing(id: string): Promise<MarketplaceListing | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as MarketplaceListing;
  }
  return null;
}

function generateBidId(): string {
  const now = new Date();
  const time = String(now.getTime()).slice(-8);
  const rand = Math.random().toString(36).substring(2, 6);
  return `bid-${time}-${rand}`;
}

function applyClientFilters(
  listings: MarketplaceListing[],
  filters?: MarketplaceFilters
): MarketplaceListing[] {
  if (!filters) return listings;

  let result = listings;

  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.title.toLowerCase().includes(searchLower) ||
        l.description.toLowerCase().includes(searchLower) ||
        l.location.city.toLowerCase().includes(searchLower) ||
        l.jobType.toLowerCase().includes(searchLower)
    );
  }

  if (filters.minPay !== undefined) {
    result = result.filter((l) => l.payRate >= (filters.minPay || 0));
  }

  if (filters.maxPay !== undefined) {
    result = result.filter((l) => l.payRate <= (filters.maxPay || Infinity));
  }

  if (filters.dateFrom) {
    result = result.filter((l) => l.dateNeeded >= filters.dateFrom!);
  }

  if (filters.dateTo) {
    result = result.filter((l) => l.dateNeeded <= filters.dateTo!);
  }

  return result;
}

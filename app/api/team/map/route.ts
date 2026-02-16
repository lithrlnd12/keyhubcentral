import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';

interface TeamMapEntry {
  id: string;
  name: string;
  role: 'installer' | 'service_tech' | 'sales_rep' | 'pm' | 'partner';
  roles: string[];
  lat: number;
  lng: number;
  city: string;
  state: string;
  serviceRadius: number;
  detail: string;
  shippingAddress?: string;
}

const TRADE_ROLE_MAP: Record<string, 'installer' | 'service_tech'> = {
  installer: 'installer',
  service_tech: 'service_tech',
};

function getTradeRoles(trades: string[]): string[] {
  const roles: string[] = [];
  for (const trade of trades) {
    const key = trade.toLowerCase().replace(/\s+/g, '_');
    const mapped = TRADE_ROLE_MAP[key];
    if (mapped && !roles.includes(mapped)) {
      roles.push(mapped);
    }
  }
  return roles.length > 0 ? roles : ['installer'];
}

function getPrimaryTradeRole(trades: string[]): 'installer' | 'service_tech' {
  const roles = getTradeRoles(trades);
  return roles[0] as 'installer' | 'service_tech';
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`,
    );
    const data = await res.json();
    if (data.status === 'OK' && data.results?.length > 0) {
      const loc = data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
  } catch (err) {
    console.error('Geocoding failed for:', address, err);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyFirebaseAuth(request);
    if (!auth.authenticated || !auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasRole(auth.role, ['owner', 'admin', 'partner'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const entries: TeamMapEntry[] = [];

    // Fetch all sources in parallel
    const [contractorsSnap, usersSnap, partnersSnap] = await Promise.all([
      db.collection('contractors').where('status', '==', 'active').get(),
      db.collection('users').where('status', '==', 'active').get(),
      db.collection('partners').where('status', '==', 'active').get(),
    ]);

    // --- Contractors ---
    const contractorGeoNeeded: { doc: FirebaseFirestore.QueryDocumentSnapshot; addr: string }[] = [];

    for (const doc of contractorsSnap.docs) {
      const data = doc.data();
      const lat = data.address?.lat;
      const lng = data.address?.lng;

      if (lat != null && lng != null) {
        const trades = data.trades || [];
        const shippingAddr = data.shippingSameAsAddress === false && data.shippingAddress
          ? [data.shippingAddress.street, data.shippingAddress.city, data.shippingAddress.state, data.shippingAddress.zip].filter(Boolean).join(', ')
          : [data.address?.street, data.address?.city, data.address?.state, data.address?.zip].filter(Boolean).join(', ') || undefined;
        entries.push({
          id: doc.id,
          name: data.businessName || data.contactName || 'Unknown',
          role: getPrimaryTradeRole(trades),
          roles: getTradeRoles(trades),
          lat,
          lng,
          city: data.address?.city || '',
          state: data.address?.state || '',
          serviceRadius: data.serviceRadius || 50,
          detail: trades.join(', ') || 'No trades listed',
          shippingAddress: shippingAddr,
        });
      } else {
        const parts = [data.address?.street, data.address?.city, data.address?.state, data.address?.zip].filter(Boolean);
        if (parts.length >= 2) {
          contractorGeoNeeded.push({ doc, addr: parts.join(', ') });
        }
      }
    }

    // --- Users (sales_rep, pm) ---
    const userGeoNeeded: { doc: FirebaseFirestore.QueryDocumentSnapshot; zip: string }[] = [];

    for (const doc of usersSnap.docs) {
      const data = doc.data();
      const role = data.role;
      if (role !== 'sales_rep' && role !== 'pm') continue;

      const lat = data.baseCoordinates?.lat;
      const lng = data.baseCoordinates?.lng;

      if (lat != null && lng != null) {
        entries.push({
          id: doc.id,
          name: data.displayName || data.email || 'Unknown',
          role: role as 'sales_rep' | 'pm',
          roles: [role],
          lat,
          lng,
          city: '',
          state: '',
          serviceRadius: 50,
          detail: data.email || '',
        });
      } else if (data.baseZipCode) {
        userGeoNeeded.push({ doc, zip: data.baseZipCode });
      }
    }

    // --- Partners ---
    const partnerGeoNeeded: { doc: FirebaseFirestore.QueryDocumentSnapshot; addr: string }[] = [];

    for (const doc of partnersSnap.docs) {
      const data = doc.data();
      const lat = data.address?.lat;
      const lng = data.address?.lng;

      if (lat != null && lng != null) {
        entries.push({
          id: doc.id,
          name: data.companyName || data.contactName || 'Unknown',
          role: 'partner',
          roles: ['partner'],
          lat,
          lng,
          city: data.address?.city || '',
          state: data.address?.state || '',
          serviceRadius: 50,
          detail: data.companyName || '',
        });
      } else {
        const parts = [data.address?.street, data.address?.city, data.address?.state, data.address?.zip].filter(Boolean);
        if (parts.length >= 2) {
          partnerGeoNeeded.push({ doc, addr: parts.join(', ') });
        }
      }
    }

    // Geocode all missing coordinates in parallel
    const geocodeResults = await Promise.all([
      // Contractors
      ...contractorGeoNeeded.map(async ({ doc, addr }) => {
        const coords = await geocodeAddress(addr);
        if (!coords) return null;
        const data = doc.data();
        db.collection('contractors').doc(doc.id).update({
          'address.lat': coords.lat,
          'address.lng': coords.lng,
        }).catch((err) => console.error('Failed to backfill coords for contractor', doc.id, err));
        const trades = data.trades || [];
        const shippingAddr = data.shippingSameAsAddress === false && data.shippingAddress
          ? [data.shippingAddress.street, data.shippingAddress.city, data.shippingAddress.state, data.shippingAddress.zip].filter(Boolean).join(', ')
          : [data.address?.street, data.address?.city, data.address?.state, data.address?.zip].filter(Boolean).join(', ') || undefined;
        return {
          id: doc.id,
          name: data.businessName || data.contactName || 'Unknown',
          role: getPrimaryTradeRole(trades),
          roles: getTradeRoles(trades),
          lat: coords.lat,
          lng: coords.lng,
          city: data.address?.city || '',
          state: data.address?.state || '',
          serviceRadius: data.serviceRadius || 50,
          detail: trades.join(', ') || 'No trades listed',
          shippingAddress: shippingAddr,
        };
      }),
      // Users (sales_rep / pm)
      ...userGeoNeeded.map(async ({ doc, zip }) => {
        const coords = await geocodeAddress(zip);
        if (!coords) return null;
        const data = doc.data();
        db.collection('users').doc(doc.id).update({
          baseCoordinates: { lat: coords.lat, lng: coords.lng },
        }).catch((err) => console.error('Failed to backfill coords for user', doc.id, err));
        return {
          id: doc.id,
          name: data.displayName || data.email || 'Unknown',
          role: data.role as 'sales_rep' | 'pm',
          roles: [data.role],
          lat: coords.lat,
          lng: coords.lng,
          city: '',
          state: '',
          serviceRadius: 50,
          detail: data.email || '',
        };
      }),
      // Partners
      ...partnerGeoNeeded.map(async ({ doc, addr }) => {
        const coords = await geocodeAddress(addr);
        if (!coords) return null;
        const data = doc.data();
        db.collection('partners').doc(doc.id).update({
          'address.lat': coords.lat,
          'address.lng': coords.lng,
        }).catch((err) => console.error('Failed to backfill coords for partner', doc.id, err));
        return {
          id: doc.id,
          name: data.companyName || data.contactName || 'Unknown',
          role: 'partner' as const,
          roles: ['partner'],
          lat: coords.lat,
          lng: coords.lng,
          city: data.address?.city || '',
          state: data.address?.state || '',
          serviceRadius: 50,
          detail: data.companyName || '',
        };
      }),
    ]);

    for (const entry of geocodeResults) {
      if (entry) entries.push(entry);
    }

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Error fetching team map data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

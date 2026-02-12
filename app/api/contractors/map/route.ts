import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';

interface ContractorMapEntry {
  id: string;
  businessName: string | null;
  trades: string[];
  lat: number;
  lng: number;
  city: string;
  state: string;
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!hasRole(auth.role, ['partner', 'owner', 'admin'])) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    const db = getAdminDb();
    const snapshot = await db
      .collection('contractors')
      .where('status', '==', 'active')
      .get();

    const contractors: ContractorMapEntry[] = [];
    const needsGeocoding: { doc: FirebaseFirestore.QueryDocumentSnapshot; addr: string }[] = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const lat = data.address?.lat;
      const lng = data.address?.lng;

      if (lat != null && lng != null) {
        contractors.push({
          id: doc.id,
          businessName: data.businessName || null,
          trades: data.trades || [],
          lat,
          lng,
          city: data.address?.city || '',
          state: data.address?.state || '',
        });
      } else {
        // Build an address string for geocoding fallback
        const parts = [
          data.address?.street,
          data.address?.city,
          data.address?.state,
          data.address?.zip,
        ].filter(Boolean);
        if (parts.length >= 2) {
          needsGeocoding.push({ doc, addr: parts.join(', ') });
        }
      }
    }

    // Geocode contractors missing coordinates (in parallel, batched)
    if (needsGeocoding.length > 0) {
      const results = await Promise.all(
        needsGeocoding.map(async ({ doc, addr }) => {
          const coords = await geocodeAddress(addr);
          if (!coords) return null;
          const data = doc.data();

          // Backfill the coordinates in Firestore for next time
          db.collection('contractors').doc(doc.id).update({
            'address.lat': coords.lat,
            'address.lng': coords.lng,
          }).catch((err) => console.error('Failed to backfill coords for', doc.id, err));

          return {
            id: doc.id,
            businessName: data.businessName || null,
            trades: data.trades || [],
            lat: coords.lat,
            lng: coords.lng,
            city: data.address?.city || '',
            state: data.address?.state || '',
          } as ContractorMapEntry;
        }),
      );

      for (const entry of results) {
        if (entry) contractors.push(entry);
      }
    }

    return NextResponse.json({ contractors });
  } catch (error) {
    console.error('Error fetching contractor map data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

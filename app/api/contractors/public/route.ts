import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';
import { env } from '@/lib/env';

interface PublicContractor {
  id: string;
  businessName: string;
  lat: number;
  lng: number;
  serviceRadius: number;
  specialties: string[];
  rating: number;
  city: string;
  state: string;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const apiKey = env.GOOGLE_MAPS_SERVER_API_KEY ?? process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
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

    if (!hasRole(auth.role, ['customer', 'owner', 'admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const db = getAdminDb();
    const contractorsSnap = await db.collection('contractors').where('status', '==', 'active').get();

    const contractors: PublicContractor[] = [];
    const geoNeeded: { doc: FirebaseFirestore.QueryDocumentSnapshot; addr: string }[] = [];

    for (const doc of contractorsSnap.docs) {
      const data = doc.data();
      const lat = data.address?.lat;
      const lng = data.address?.lng;

      if (lat != null && lng != null) {
        contractors.push({
          id: doc.id,
          businessName: data.businessName || 'Contractor',
          lat,
          lng,
          serviceRadius: data.serviceRadius || 25,
          specialties: data.specialties || [],
          rating: data.rating?.overall || 0,
          city: data.address?.city || '',
          state: data.address?.state || '',
        });
      } else {
        const parts = [data.address?.street, data.address?.city, data.address?.state, data.address?.zip].filter(Boolean);
        if (parts.length >= 2) {
          geoNeeded.push({ doc, addr: parts.join(', ') });
        }
      }
    }

    // Geocode missing coordinates in parallel
    const geocodeResults = await Promise.all(
      geoNeeded.map(async ({ doc, addr }) => {
        const coords = await geocodeAddress(addr);
        if (!coords) return null;
        const data = doc.data();

        // Backfill coordinates
        db.collection('contractors').doc(doc.id).update({
          'address.lat': coords.lat,
          'address.lng': coords.lng,
        }).catch((err) => console.error('Failed to backfill coords for contractor', doc.id, err));

        return {
          id: doc.id,
          businessName: data.businessName || 'Contractor',
          lat: coords.lat,
          lng: coords.lng,
          serviceRadius: data.serviceRadius || 25,
          specialties: data.specialties || [],
          rating: data.rating?.overall || 0,
          city: data.address?.city || '',
          state: data.address?.state || '',
        };
      })
    );

    for (const entry of geocodeResults) {
      if (entry) contractors.push(entry);
    }

    return NextResponse.json({ contractors });
  } catch (error) {
    console.error('Error fetching public contractors:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

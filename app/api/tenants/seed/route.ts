import { NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// POST /api/tenants/seed — creates a demo tenant for testing
// Remove this route before production
export async function POST() {
  try {
    const db = getAdminDb();

    const demoTenant = {
      slug: 'demo-contractor',
      companyName: 'Smith Home Renovations',
      tagline: 'Quality craftsmanship, every time.',
      branding: {
        logoUrl: '',
        faviconUrl: '',
        primaryColor: '#2563EB', // blue — to prove white-label theming works
        accentColor: '#3B82F6',
        backgroundColor: '#0F172A', // slate-900
        textColor: '#F8FAFC',
      },
      contact: {
        email: 'info@smithrenovations.com',
        phone: '(405) 555-0123',
        website: 'smithrenovations.com',
        address: 'Oklahoma City, OK',
      },
      ownerId: 'demo-owner',
      ownerEmail: 'owner@smithrenovations.com',
      features: {
        jobTracking: true,
        invoices: true,
        messaging: true,
        documents: true,
        photos: true,
        scheduling: true,
      },
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection('tenants').add(demoTenant);

    return NextResponse.json({
      success: true,
      tenantId: docRef.id,
      slug: demoTenant.slug,
      portalUrl: `/p/${demoTenant.slug}`,
      message: 'Demo tenant created. Visit /p/demo-contractor to see the portal.',
    });
  } catch (error: unknown) {
    console.error('Error seeding tenant:', error);
    return NextResponse.json(
      { error: 'Failed to create demo tenant' },
      { status: 500 }
    );
  }
}

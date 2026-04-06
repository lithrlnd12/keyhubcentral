import { NextResponse } from 'next/server';
import { getSystemDb } from '@/lib/firebase/adminSystem';
import { tenant } from '@/lib/config/tenant';

export async function GET() {
  try {
    const db = getSystemDb();
    const tenantsSnap = await db.collection('tenants').get();

    const registry: { tenantId: string; name: string; domain: string }[] = [];

    for (const doc of tenantsSnap.docs) {
      const data = doc.data();

      // Only include tenants with keyhubNetwork enabled
      if (!data.featureFlags?.keyhubNetwork) continue;

      // Exclude self
      if (data.firebaseProjectId === tenant.firebaseProjectId) continue;

      registry.push({
        tenantId: data.firebaseProjectId || doc.id,
        name: data.companyName || data.name || doc.id,
        domain: data.domain || '',
      });
    }

    return NextResponse.json(registry);
  } catch (error) {
    console.error('Network registry error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network registry' },
      { status: 500 }
    );
  }
}

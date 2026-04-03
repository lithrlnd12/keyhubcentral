import { NextRequest, NextResponse } from 'next/server';
import { getSystemDb } from '@/lib/firebase/adminSystem';
import { tenant } from '@/lib/config/tenant';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { toTenantId, toTenantName, message } = body;

    if (!toTenantId || !toTenantName) {
      return NextResponse.json(
        { error: 'toTenantId and toTenantName are required' },
        { status: 400 }
      );
    }

    const db = getSystemDb();

    // Check for existing pending invite between these tenants
    const existingSnap = await db
      .collection('networkInvites')
      .where('fromTenantId', '==', tenant.firebaseProjectId)
      .where('toTenantId', '==', toTenantId)
      .where('status', '==', 'pending')
      .get();

    if (!existingSnap.empty) {
      return NextResponse.json(
        { error: 'An invite to this tenant is already pending' },
        { status: 409 }
      );
    }

    const inviteRef = db.collection('networkInvites').doc();
    const invite = {
      fromTenantId: tenant.firebaseProjectId,
      fromTenantName: tenant.appName,
      toTenantId,
      toTenantName,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...(message ? { message } : {}),
    };

    await inviteRef.set(invite);

    return NextResponse.json({ id: inviteRef.id, ...invite }, { status: 201 });
  } catch (error) {
    console.error('Create invite error:', error);
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const db = getSystemDb();
    const thisTenant = tenant.firebaseProjectId;

    // Fetch outbound and inbound invites in parallel
    const [outboundSnap, inboundSnap] = await Promise.all([
      db.collection('networkInvites').where('fromTenantId', '==', thisTenant).get(),
      db.collection('networkInvites').where('toTenantId', '==', thisTenant).get(),
    ]);

    const outbound = outboundSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const inbound = inboundSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ inbound, outbound });
  } catch (error) {
    console.error('Fetch invites error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}

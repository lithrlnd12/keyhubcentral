import { NextRequest, NextResponse } from 'next/server';
import { getSystemDb } from '@/lib/firebase/adminSystem';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "accept" or "reject"' },
        { status: 400 }
      );
    }

    const db = getSystemDb();
    const inviteRef = db.collection('networkInvites').doc(id);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const invite = inviteSnap.data()!;

    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: `Invite already ${invite.status}` },
        { status: 409 }
      );
    }

    if (action === 'accept') {
      // Create deterministic network ID
      const networkId = [invite.fromTenantId, invite.toTenantId].sort().join('_');

      // Create network doc
      await db.collection('networks').doc(networkId).set({
        tenants: [invite.fromTenantId, invite.toTenantId],
        sharedFeatures: { contractors: true, marketplace: true },
        status: 'active',
        connectedAt: new Date().toISOString(),
      });

      // Update invite
      await inviteRef.update({
        status: 'accepted',
        respondedAt: new Date().toISOString(),
      });

      return NextResponse.json({ status: 'accepted', networkId });
    } else {
      // Reject
      await inviteRef.update({
        status: 'rejected',
        respondedAt: new Date().toISOString(),
      });

      return NextResponse.json({ status: 'rejected' });
    }
  } catch (error) {
    console.error('Respond to invite error:', error);
    return NextResponse.json(
      { error: 'Failed to respond to invite' },
      { status: 500 }
    );
  }
}

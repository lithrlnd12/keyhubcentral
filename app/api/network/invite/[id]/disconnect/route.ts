import { NextRequest, NextResponse } from 'next/server';
import { getSystemDb } from '@/lib/firebase/adminSystem';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getSystemDb();

    const inviteRef = db.collection('networkInvites').doc(id);
    const inviteSnap = await inviteRef.get();

    if (!inviteSnap.exists) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const invite = inviteSnap.data()!;

    if (invite.status !== 'accepted') {
      return NextResponse.json(
        { error: 'Can only disconnect accepted connections' },
        { status: 400 }
      );
    }

    // Update the network doc
    const networkId = [invite.fromTenantId, invite.toTenantId].sort().join('_');
    const networkRef = db.collection('networks').doc(networkId);
    const networkSnap = await networkRef.get();

    if (networkSnap.exists) {
      await networkRef.update({ status: 'disconnected' });
    }

    // Update the invite
    await inviteRef.update({
      status: 'disconnected',
      respondedAt: new Date().toISOString(),
    });

    return NextResponse.json({ status: 'disconnected' });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}

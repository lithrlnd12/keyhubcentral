import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, doc, increment, updateDoc } from 'firebase/firestore';
import { LeadSource } from '@/types/lead';

/**
 * LeadsBridge (and compatible) webhook receiver.
 *
 * Setup in LeadsBridge:
 *   Destination URL: https://yourdomain.com/api/leads/webhook?token=YOUR_SECRET&campaignId=CAMPAIGN_ID
 *
 * The `token` query param must match LEADSBRIDGE_WEBHOOK_SECRET in your env.
 * The `campaignId` query param is optional — set it per LeadsBridge bridge to tag
 * leads to the correct campaign automatically.
 *
 * LeadsBridge normalizes fields from Facebook, Google, and TikTok into a consistent
 * payload. This endpoint maps those fields to KeyHub's lead schema.
 */

// Maps common platform field names to our schema
function mapFields(body: Record<string, string>) {
  const get = (...keys: string[]) => {
    for (const k of keys) {
      if (body[k]) return body[k];
    }
    return '';
  };

  const firstName = get('first_name', 'firstName', 'fname');
  const lastName = get('last_name', 'lastName', 'lname');
  const name = get('full_name', 'name') || [firstName, lastName].filter(Boolean).join(' ');

  const rawPhone = get('phone', 'phone_number', 'mobile', 'cell');
  const phone = rawPhone.replace(/\D/g, '').replace(/^1/, '') || null;

  const email = get('email', 'email_address')?.toLowerCase() || null;

  const street = get('street', 'address', 'street_address');
  const city = get('city', 'city_name');
  const state = get('state', 'region', 'province');
  const zip = get('zip', 'zip_code', 'postal_code', 'postcode');

  const trade = get('trade', 'service', 'project_type', 'service_type', 'interest');
  const notes = get('notes', 'message', 'comments', 'description', 'additional_info');

  // Infer source from platform field if present
  const platform = get('platform', 'source', 'lead_source', 'ad_platform')?.toLowerCase();
  let source: LeadSource = 'other';
  if (platform?.includes('google')) source = 'google_ads';
  else if (platform?.includes('facebook') || platform?.includes('meta') || platform?.includes('fb')) source = 'meta';
  else if (platform?.includes('tiktok')) source = 'tiktok';

  return { name, phone, email, street, city, state, zip, trade, notes, source };
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const campaignId = searchParams.get('campaignId') || null;

  // Verify secret token
  const secret = process.env.LEADSBRIDGE_WEBHOOK_SECRET;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, string> = {};
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // Form-encoded
      const text = await request.text();
      text.split('&').forEach((pair) => {
        const [k, v] = pair.split('=');
        if (k) body[decodeURIComponent(k)] = decodeURIComponent(v || '');
      });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { name, phone, email, street, city, state, zip, trade, notes, source } = mapFields(body);

  if (!name && !phone && !email) {
    return NextResponse.json({ error: 'No usable lead data found' }, { status: 400 });
  }

  try {
    const lead = {
      source,
      campaignId,
      market: city && state ? `${city}, ${state}` : '',
      trade,
      customer: {
        name: name || 'Unknown',
        phone,
        email,
        address: { street, city, state, zip },
        notes: notes || null,
      },
      quality: 'warm',
      status: 'new',
      assignedTo: null,
      assignedType: null,
      returnReason: null,
      returnedAt: null,
      smsCallOptIn: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await addDoc(collection(db, 'leads'), lead);

    // Increment campaign counter if tagged
    if (campaignId) {
      await updateDoc(doc(db, 'campaigns', campaignId), {
        leadsGenerated: increment(1),
        updatedAt: serverTimestamp(),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook lead creation error:', error);
    return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 });
  }
}

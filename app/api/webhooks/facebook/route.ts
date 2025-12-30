import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { verifyFacebookSignature } from '@/lib/auth/webhookSignature';

// Facebook Webhook Verify Token - MUST be set in environment variables
const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN;
const APP_SECRET = process.env.FB_APP_SECRET;

// GET - Facebook webhook verification
export async function GET(request: NextRequest) {
  if (!VERIFY_TOKEN) {
    console.error('FB_WEBHOOK_VERIFY_TOKEN not configured');
    return new NextResponse('Server configuration error', { status: 500 });
  }

  const searchParams = request.nextUrl.searchParams;

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  // Check if this is a subscription verification request
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Facebook webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  console.log('Facebook webhook verification failed');
  return new NextResponse('Forbidden', { status: 403 });
}

// POST - Receive lead data from Facebook
export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();

    // Verify webhook signature if APP_SECRET is configured
    if (APP_SECRET) {
      const signature = request.headers.get('X-Hub-Signature-256');

      if (!verifyFacebookSignature(rawBody, signature, APP_SECRET)) {
        console.error('Facebook webhook signature verification failed');
        return new NextResponse('Invalid signature', { status: 401 });
      }
    } else {
      console.warn('FB_APP_SECRET not configured - signature verification disabled');
    }

    const body = JSON.parse(rawBody);

    console.log('Facebook webhook received:', JSON.stringify(body, null, 2));

    // Facebook sends data in this structure:
    // {
    //   "object": "page",
    //   "entry": [{
    //     "id": "page_id",
    //     "time": 1234567890,
    //     "changes": [{
    //       "field": "leadgen",
    //       "value": {
    //         "form_id": "form_id",
    //         "leadgen_id": "lead_id",
    //         "created_time": 1234567890,
    //         "page_id": "page_id"
    //       }
    //     }]
    //   }]
    // }

    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenData = change.value;

            // At this point, you have the lead ID but need to fetch the actual data
            // from Facebook's Graph API using the leadgen_id
            // This requires the page access token

            // For now, we'll store the lead notification and you can
            // either fetch the data with a separate process or
            // we can enhance this once you have the access token

            await createLeadFromFacebook({
              leadgenId: leadgenData.leadgen_id,
              formId: leadgenData.form_id,
              pageId: leadgenData.page_id,
              createdTime: leadgenData.created_time,
            });
          }
        }
      }
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Error processing Facebook webhook:', error);
    // Still return 200 to prevent Facebook from retrying
    return NextResponse.json({ status: 'error', message: 'Processing failed' });
  }
}

interface FacebookLeadData {
  leadgenId: string;
  formId: string;
  pageId: string;
  createdTime: number;
  // These fields come from fetching the lead data from Graph API
  fullName?: string;
  email?: string;
  phone?: string;
  fieldData?: Array<{ name: string; values: string[] }>;
}

async function createLeadFromFacebook(data: FacebookLeadData) {
  try {
    // Parse field data if available (from Graph API fetch)
    let name = data.fullName || 'Facebook Lead';
    let email: string | null = data.email || null;
    let phone: string | null = data.phone || null;
    let notes = '';

    if (data.fieldData) {
      for (const field of data.fieldData) {
        const value = field.values?.[0] || '';
        switch (field.name.toLowerCase()) {
          case 'full_name':
          case 'name':
            name = value;
            break;
          case 'email':
            email = value;
            break;
          case 'phone_number':
          case 'phone':
            phone = value;
            break;
          default:
            // Add other fields to notes
            if (value) {
              notes += `${field.name}: ${value}\n`;
            }
        }
      }
    }

    // Schedule auto-call immediately for testing (change to +10 minutes for production)
    let scheduledCallAt = null;
    if (phone) {
      const callTime = new Date();
      // callTime.setMinutes(callTime.getMinutes() + 10); // Production: 10 min delay
      scheduledCallAt = callTime;
    }

    // Create the lead in Firestore
    const leadData = {
      source: 'meta' as const,
      campaignId: null,
      market: 'Facebook',
      trade: 'General',
      customer: {
        name,
        phone,
        email,
        address: {
          street: '',
          city: '',
          state: '',
          zip: '',
          lat: null,
          lng: null,
        },
        notes: notes || `Facebook Lead ID: ${data.leadgenId}`,
      },
      quality: 'warm' as const,
      status: 'new' as const,
      assignedTo: null,
      assignedType: null,
      returnReason: null,
      returnedAt: null,
      // Auto-call fields
      scheduledCallAt,
      autoCallEnabled: !!phone,
      callAttempts: 0,
      // Store Facebook-specific data for reference
      facebookData: {
        leadgenId: data.leadgenId,
        formId: data.formId,
        pageId: data.pageId,
        createdTime: data.createdTime,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await getAdminDb().collection('leads').add(leadData);
    console.log('Created Facebook lead:', docRef.id);

    return docRef.id;
  } catch (error) {
    console.error('Error creating lead from Facebook:', error);
    throw error;
  }
}

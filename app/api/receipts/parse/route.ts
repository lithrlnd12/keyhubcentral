import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Timestamp } from 'firebase-admin/firestore';
import { verifyFirebaseAuth, isInternal } from '@/lib/auth/verifyRequest';
import { getAdminDb } from '@/lib/firebase/admin';

// Server-side receipt functions using Admin SDK
async function getReceiptAdmin(id: string) {
  const db = getAdminDb();
  const doc = await db.collection('receipts').doc(id).get();
  if (doc.exists) {
    return { id: doc.id, ...doc.data() };
  }
  return null;
}

async function updateReceiptStatusAdmin(
  id: string,
  status: string,
  errorMessage?: string
) {
  const db = getAdminDb();
  const updateData: Record<string, unknown> = { status };
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }
  await db.collection('receipts').doc(id).update(updateData);
}

async function updateReceiptParsedDataAdmin(
  id: string,
  parsedData: ParsedReceiptData
) {
  const db = getAdminDb();
  await db.collection('receipts').doc(id).update({
    parsedData,
    vendor: parsedData?.vendor || null,
    purchaseDate: parsedData?.date ? Timestamp.fromDate(new Date(parsedData.date)) : null,
    subtotal: parsedData?.subtotal || null,
    tax: parsedData?.tax || null,
    total: parsedData?.total || null,
    items: parsedData?.items?.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total,
      category: item.category || null,
    })) || [],
    status: 'parsed',
  });
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const RECEIPT_PARSING_PROMPT = `Analyze this receipt/invoice/document and extract the following information:

1. Vendor/Store name
2. Date of purchase (format as YYYY-MM-DD)
3. Line items with:
   - Description
   - Quantity (default to 1 if not shown)
   - Unit price
   - Total for the item
   - Category: "material" or "tool"
     * "material" = consumable supplies (screws, nails, lumber, wire, pipe, paint, tape, glue, caulk, sandpaper, filters, etc.)
     * "tool" = reusable equipment (drills, saws, hammers, wrenches, meters, ladders, etc.)
4. Subtotal (before tax)
5. Tax amount
6. Grand total

Return ONLY a valid JSON object in this exact format (no markdown, no explanation, just JSON):
{
  "vendor": "Store Name",
  "date": "YYYY-MM-DD",
  "items": [
    {
      "description": "Item description",
      "quantity": 1,
      "unitPrice": 0.00,
      "total": 0.00,
      "category": "material"
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00
}

If a value cannot be determined from the document, use null for that field.
If the document is not a receipt/invoice or is unreadable, return:
{
  "error": "Description of the problem"
}`;

interface ParsedReceiptData {
  vendor?: string;
  date?: string;
  items?: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    category?: 'material' | 'tool';
  }>;
  subtotal?: number;
  tax?: number;
  total?: number;
  error?: string;
  rawResponse?: string;
}

export async function POST(request: NextRequest) {
  // Verify authentication - only internal users can parse receipts
  const auth = await verifyFirebaseAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', details: auth.error },
      { status: 401 }
    );
  }

  if (!isInternal(auth.role)) {
    return NextResponse.json(
      { error: 'Forbidden: Internal users only' },
      { status: 403 }
    );
  }

  try {
    const { receiptId, imageUrl } = await request.json();

    if (!receiptId || !imageUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: receiptId and imageUrl' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI parsing is not configured. Please add ANTHROPIC_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    // Verify receipt exists
    const receipt = await getReceiptAdmin(receiptId);
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Update status to parsing
    await updateReceiptStatusAdmin(receiptId, 'parsing');

    // Fetch the file and convert to base64
    const fileResponse = await fetch(imageUrl);
    if (!fileResponse.ok) {
      await updateReceiptStatusAdmin(receiptId, 'error', 'Failed to fetch document');
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: 400 }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');

    // Determine media type from URL or response
    const contentType = fileResponse.headers.get('content-type') || 'image/jpeg';
    const isPdf = contentType.includes('pdf') || imageUrl.toLowerCase().endsWith('.pdf');

    // Build the content array based on file type
    let content: Anthropic.MessageCreateParams['messages'][0]['content'];

    if (isPdf) {
      // Use document type for PDFs
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: RECEIPT_PARSING_PROMPT,
        },
      ];
    } else {
      // Use image type for images
      const mediaType = contentType.includes('png') ? 'image/png'
        : contentType.includes('gif') ? 'image/gif'
        : contentType.includes('webp') ? 'image/webp'
        : 'image/jpeg';

      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
            data: base64Data,
          },
        },
        {
          type: 'text',
          text: RECEIPT_PARSING_PROMPT,
        },
      ];
    }

    // Call Claude API with the document/image
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content,
        },
      ],
    });

    // Extract the text response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      await updateReceiptStatusAdmin(receiptId, 'error', 'No text response from AI');
      return NextResponse.json(
        { error: 'Unexpected response type from AI' },
        { status: 500 }
      );
    }

    const rawResponse = textContent.text.trim();

    // Try to parse the JSON response
    let parsedData: ParsedReceiptData;
    try {
      // Remove any markdown code blocks if present
      const jsonString = rawResponse
        .replace(/^```json?\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();

      parsedData = JSON.parse(jsonString);
      parsedData.rawResponse = rawResponse;
    } catch {
      // If JSON parsing fails, store the raw response as an error
      parsedData = {
        error: 'Failed to parse AI response as JSON',
        rawResponse,
      };
    }

    // Check for parsing errors
    if (parsedData.error) {
      await updateReceiptStatusAdmin(receiptId, 'error', parsedData.error);
      return NextResponse.json({
        success: false,
        error: parsedData.error,
        rawResponse,
      });
    }

    // Update the receipt with parsed data
    await updateReceiptParsedDataAdmin(receiptId, parsedData);

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    console.error('Receipt parsing error:', error);

    // Try to update receipt status if we have the ID
    try {
      const body = await request.clone().json();
      if (body.receiptId) {
        await updateReceiptStatusAdmin(body.receiptId, 'error', 'Failed to process receipt');
      }
    } catch {
      // Ignore errors during error handling
    }

    return NextResponse.json(
      { error: 'Failed to parse receipt' },
      { status: 500 }
    );
  }
}

// GET endpoint to check parsing status
export async function GET(request: NextRequest) {
  const auth = await verifyFirebaseAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const receiptId = searchParams.get('receiptId');

  if (!receiptId) {
    return NextResponse.json(
      { error: 'Missing receiptId parameter' },
      { status: 400 }
    );
  }

  try {
    const receipt = await getReceiptAdmin(receiptId) as { status: string; parsedData?: unknown; errorMessage?: string } | null;

    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: receipt.status,
      parsedData: receipt.parsedData,
      errorMessage: receipt.errorMessage,
    });
  } catch (error) {
    console.error('Error fetching receipt status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch receipt status' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth, isInternal } from '@/lib/auth/verifyRequest';
import { updateReceiptParsedData, updateReceiptStatus, getReceipt } from '@/lib/firebase/receipts';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const RECEIPT_PARSING_PROMPT = `Analyze this receipt image and extract the following information:

1. Vendor/Store name
2. Date of purchase (format as YYYY-MM-DD)
3. Line items with:
   - Description
   - Quantity (default to 1 if not shown)
   - Unit price
   - Total for the item
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
      "total": 0.00
    }
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "total": 0.00
}

If a value cannot be determined from the receipt, use null for that field.
If the image is not a receipt or is unreadable, return:
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
    const receipt = await getReceipt(receiptId);
    if (!receipt) {
      return NextResponse.json(
        { error: 'Receipt not found' },
        { status: 404 }
      );
    }

    // Update status to parsing
    await updateReceiptStatus(receiptId, 'parsing');

    // Fetch the image and convert to base64
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      await updateReceiptStatus(receiptId, 'error', 'Failed to fetch receipt image');
      return NextResponse.json(
        { error: 'Failed to fetch receipt image' },
        { status: 400 }
      );
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Determine media type from URL or response
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const mediaType = contentType.includes('png') ? 'image/png'
      : contentType.includes('gif') ? 'image/gif'
      : contentType.includes('webp') ? 'image/webp'
      : 'image/jpeg';

    // Call Claude API with the image
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: RECEIPT_PARSING_PROMPT,
            },
          ],
        },
      ],
    });

    // Extract the text response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      await updateReceiptStatus(receiptId, 'error', 'No text response from AI');
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
      await updateReceiptStatus(receiptId, 'error', parsedData.error);
      return NextResponse.json({
        success: false,
        error: parsedData.error,
        rawResponse,
      });
    }

    // Update the receipt with parsed data
    await updateReceiptParsedData(receiptId, parsedData);

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
        await updateReceiptStatus(body.receiptId, 'error', 'Failed to process receipt');
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
    const receipt = await getReceipt(receiptId);

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

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SWO_PARSING_PROMPT = `Analyze this Service Work Order (SWO) PDF and extract the following information:

1. Customer/Service Address name (the person at the service location)
2. Customer phone number from the Service Address section
3. Service Address: street, city, state, zip
4. Notes / issue description (what needs to be done)
5. Product information: combine Item #, Serial #, and any product descriptions into one string
6. Failure type: look for checkboxes like "Manufacturer Defect", "Shipping Damage", "Installer Error", "Customer Misuse", etc.
   - Map "Manufacturer Defect" → "warranty"
   - Map "Shipping Damage" → "warranty"
   - Map "Installer Error" → "callback"
   - Map "Customer Misuse" → "repair"
   - Default to "other" if unclear
7. Service Order # (e.g., "830000698")
8. SalesForce Case # or Case # (e.g., "08766282")
9. Line items with activity, description, quantity, and estimated cost
10. Total estimated cost (sum of all line item estimated costs)

Return ONLY a valid JSON object in this exact format (no markdown, no explanation, just JSON):
{
  "customerName": "Full Name",
  "customerPhone": "+1XXXXXXXXXX",
  "serviceAddress": {
    "street": "123 Main St",
    "city": "City",
    "state": "ST",
    "zip": "12345"
  },
  "issueDescription": "Description of the issue",
  "productInfo": "Item #12345, Serial #ABC123 - Product description",
  "issueType": "warranty",
  "serviceOrderNumber": "830000698",
  "caseNumber": "08766282",
  "estimatedCost": 150.00,
  "lineItems": [
    {
      "activity": "Activity name",
      "description": "Description of work",
      "quantity": 1,
      "estimatedCost": 150.00
    }
  ]
}

If a value cannot be determined from the document, use null for that field.
If the document is not a Service Work Order or is unreadable, return:
{
  "error": "Description of the problem"
}`;

export async function POST(request: NextRequest) {
  const auth = await verifyFirebaseAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', details: auth.error },
      { status: 401 }
    );
  }

  if (!hasRole(auth.role, ['partner', 'owner', 'admin'])) {
    return NextResponse.json(
      { error: 'Forbidden: Partners and admins only' },
      { status: 403 }
    );
  }

  try {
    const { fileUrl } = await request.json();

    if (!fileUrl) {
      return NextResponse.json(
        { error: 'Missing required field: fileUrl' },
        { status: 400 }
      );
    }

    // SSRF protection: only allow Firebase Storage URLs
    const allowedUrlPatterns = [
      /^https:\/\/firebasestorage\.googleapis\.com\//,
      /^https:\/\/storage\.googleapis\.com\//,
    ];

    try {
      const parsedUrl = new URL(fileUrl);
      if (parsedUrl.protocol !== 'https:') {
        return NextResponse.json(
          { error: 'Only HTTPS URLs are allowed' },
          { status: 400 }
        );
      }
      if (!allowedUrlPatterns.some(pattern => pattern.test(fileUrl))) {
        return NextResponse.json(
          { error: 'Only Firebase Storage URLs are allowed' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI parsing is not configured. Please add ANTHROPIC_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    // Fetch the PDF and convert to base64
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch document' },
        { status: 400 }
      );
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');

    // Call Claude API with the PDF
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
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
              text: SWO_PARSING_PROMPT,
            },
          ],
        },
      ],
    });

    // Extract the text response
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response type from AI' },
        { status: 500 }
      );
    }

    const rawResponse = textContent.text.trim();

    // Try to parse the JSON response
    let parsedData;
    try {
      const jsonString = rawResponse
        .replace(/^```json?\s*/i, '')
        .replace(/```\s*$/, '')
        .trim();

      parsedData = JSON.parse(jsonString);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse AI response as JSON',
        rawResponse,
      });
    }

    if (parsedData.error) {
      return NextResponse.json({
        success: false,
        error: parsedData.error,
      });
    }

    return NextResponse.json({
      success: true,
      data: parsedData,
    });
  } catch (error) {
    console.error('Work order parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse work order' },
      { status: 500 }
    );
  }
}

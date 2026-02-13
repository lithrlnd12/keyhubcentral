import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const LABOR_ORDER_PARSING_PROMPT = `Analyze this work order or labor request PDF and extract the following information:

1. Work type: one of "installation", "repair", "maintenance", "inspection", or "other"
2. Description of work to be performed
3. Job site / service address: street, city, state, zip
4. Date needed or scheduled date
5. Estimated duration (e.g., "2-3 days", "4 hours")
6. Crew size needed (number of workers)
7. Skills required (e.g., "Plumbing", "Electrical", "HVAC")
8. Special equipment needed
9. Any additional notes

Return ONLY a valid JSON object in this exact format (no markdown, no explanation, just JSON):
{
  "workType": "installation",
  "description": "Description of work to be done",
  "location": {
    "street": "123 Main St",
    "city": "City",
    "state": "ST",
    "zip": "12345"
  },
  "dateNeeded": "2026-03-15",
  "estimatedDuration": "2-3 days",
  "crewSize": 2,
  "skillsRequired": ["Plumbing", "Electrical"],
  "specialEquipment": "Scaffolding",
  "notes": "Additional notes"
}

If a value cannot be determined from the document, use null for that field.
If the document is not a work order or is unreadable, return:
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
              text: LABOR_ORDER_PARSING_PROMPT,
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
    console.error('Labor order parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse work order' },
      { status: 500 }
    );
  }
}

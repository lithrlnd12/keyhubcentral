import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth, isInternal } from '@/lib/auth/verifyRequest';
import { tenant } from '@/lib/config/tenant';
import { LeadImportParseResponse } from '@/types/leadImport';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const IMPORT_PROMPT = `You are a lead management assistant for ${tenant.appName}. Parse this document (spreadsheet, CSV, PDF, or image) and extract all leads/contacts/customers.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "leads": [
    {
      "name": "Full Name",
      "phone": "5551234567",
      "email": "email@example.com",
      "address": {
        "street": "123 Main St",
        "city": "Oklahoma City",
        "state": "OK",
        "zip": "73101"
      },
      "source": "other",
      "quality": "warm",
      "market": "OKC Metro",
      "trade": "Kitchen Remodel",
      "notes": "Any relevant notes from the document"
    }
  ],
  "summary": "Parsed X leads from [document type]",
  "sourceType": "csv",
  "duplicateWarnings": ["John Smith appears twice (rows 3 and 7)"]
}

RULES:
- "name": Full name. Combine first + last if separate columns. If only a company name, use that.
- "phone": Extract digits only, no formatting. Handle formats like (555) 123-4567, 555.123.4567, +1-555-123-4567, etc. Strip country code if present. Empty string "" if not available.
- "email": Lowercase. Empty string "" if not available.
- "address": Parse into street/city/state/zip. Use empty strings for missing parts. Handle combined address fields (e.g. "123 Main St, OKC, OK 73101").
- "source": One of: google_ads, meta, tiktok, event, referral, customer_portal, other. Default to "other" if not specified or unclear.
- "quality": One of: hot, warm, cold. Default to "warm" if not specified. Use context clues (e.g. "interested" = warm/hot, "cold call list" = cold).
- "market": Geographic market area if available (e.g. "OKC Metro", "Dallas"). Empty string "" if not available.
- "trade": Type of work/service needed if available (e.g. "Kitchen Remodel", "Roofing", "Bathroom"). Empty string "" if not available.
- "notes": Any additional info that doesn't fit other fields. Combine relevant notes. Empty string "" if nothing.
- "sourceType": "csv" for CSV/text, "excel" for spreadsheets, "pdf" for PDFs, "image" for photos/scans
- "duplicateWarnings": Array of strings noting any duplicate names, phones, or emails found in the data. Empty array if no duplicates.
- Deduplicate exact matches (same name AND phone). For near-duplicates, include both but add a warning.
- Be generous with parsing - real-world data is messy. Extract what you can, leave empty strings for what you cannot.
- Return ONLY valid JSON`;

export async function POST(request: NextRequest) {
  const auth = await verifyFirebaseAuth(request);

  if (!auth.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isInternal(auth.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'AI is not configured. Please add ANTHROPIC_API_KEY to environment variables.' },
      { status: 500 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Unsupported file type. Upload Excel (.xlsx/.xls), CSV, PDF, or image files.' },
        { status: 400 }
      );
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Maximum 10MB.' }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(fileBuffer).toString('base64');

    // Determine content type for Claude
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    const isSpreadsheet = file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
    const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');

    let content: Anthropic.MessageCreateParams['messages'][0]['content'];

    if (isPdf) {
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/pdf',
            data: base64Data,
          },
        },
        { type: 'text', text: IMPORT_PROMPT },
      ];
    } else if (isImage) {
      const mediaType = file.type.includes('png') ? 'image/png'
        : file.type.includes('webp') ? 'image/webp'
        : 'image/jpeg';

      content = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/webp',
            data: base64Data,
          },
        },
        { type: 'text', text: IMPORT_PROMPT },
      ];
    } else if (isCsv) {
      // For CSV, send as text
      const csvText = new TextDecoder().decode(fileBuffer);
      content = [
        {
          type: 'text',
          text: `${IMPORT_PROMPT}\n\nCSV DATA:\n${csvText}`,
        },
      ];
    } else if (isSpreadsheet) {
      // For Excel files, send as document with type assertion
      content = [
        {
          type: 'document',
          source: {
            type: 'base64',
            media_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as 'application/pdf',
            data: base64Data,
          },
        },
        { type: 'text', text: IMPORT_PROMPT },
      ];
    } else {
      return NextResponse.json({ error: 'Could not determine file type' }, { status: 400 });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content }],
    });

    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected AI response' }, { status: 500 });
    }

    let parsed: LeadImportParseResponse;
    try {
      const cleaned = textContent.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json({ error: 'Failed to parse lead data from file' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Lead import error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}

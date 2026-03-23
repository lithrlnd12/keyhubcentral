import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth, isInternal } from '@/lib/auth/verifyRequest';
import { tenant } from '@/lib/config/tenant';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ParsedInventoryItem {
  name: string;
  category: 'material' | 'tool';
  sku: string;
  description: string;
  unitOfMeasure: string;
  parLevel: number;
  currentQuantity: number;
  cost: number | null;
  manufacturer: string;
  partNumber: string;
}

export interface ImportParseResponse {
  items: ParsedInventoryItem[];
  summary: string;
  sourceType: string;
}

const IMPORT_PROMPT = `You are an inventory management assistant for ${tenant.appName}. Parse this document (spreadsheet, PDF, or inventory list) and extract all inventory items.

Return ONLY valid JSON (no markdown, no explanation) with this exact structure:
{
  "items": [
    {
      "name": "Item Name",
      "category": "material",
      "sku": "SKU-123",
      "description": "Brief description",
      "unitOfMeasure": "each",
      "parLevel": 10,
      "currentQuantity": 5,
      "cost": 12.99,
      "manufacturer": "Brand Name",
      "partNumber": "PN-456"
    }
  ],
  "summary": "Parsed X materials and Y tools from [document type]",
  "sourceType": "excel"
}

RULES:
- "category": "material" for consumable supplies (screws, nails, lumber, wire, pipe, paint, tape, caulk, drywall, etc.), "tool" for reusable equipment (drills, saws, hammers, wrenches, etc.)
- "unitOfMeasure" must be one of: each, box, pack, roll, case, pair, set, gallon, quart, foot, yard, pound, bag, bundle. Default to "each" if unclear.
- "parLevel": If the document has a par/min/reorder level use it. Otherwise estimate a reasonable par based on the item type (e.g. consumables ~10-20, tools ~1-2).
- "currentQuantity": If the document shows current stock/on-hand quantity, use it. Otherwise set to 0.
- "cost": Unit cost if shown. null if not available.
- "sku", "manufacturer", "partNumber", "description": Extract if available, empty string "" if not.
- "sourceType": "excel" for spreadsheets, "pdf" for PDFs, "image" for photos/scans
- Deduplicate items with the same name (combine quantities if at different locations)
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
      // Claude API supports xlsx but the SDK types are restrictive
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

    let parsed: ImportParseResponse;
    try {
      const cleaned = textContent.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', textContent.text);
      return NextResponse.json({ error: 'Failed to parse inventory data from file' }, { status: 500 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Inventory import error:', error);
    return NextResponse.json(
      { error: 'Failed to process file' },
      { status: 500 }
    );
  }
}

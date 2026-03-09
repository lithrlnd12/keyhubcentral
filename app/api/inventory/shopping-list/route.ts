import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth, isInternal } from '@/lib/auth/verifyRequest';
import { tenant } from '@/lib/config/tenant';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface ShoppingListItem {
  itemName: string;
  category: 'material' | 'tool';
  sku: string;
  currentQuantity: number;
  parLevel: number;
  orderQuantity: number;
  unitOfMeasure: string;
  estimatedCost: number | null;
  priority: 'critical' | 'low' | 'restock';
  locationName: string;
  notes: string;
}

export interface ShoppingListResponse {
  items: ShoppingListItem[];
  summary: string;
  totalEstimatedCost: number | null;
  generatedAt: string;
}

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
    const { alerts, items } = await request.json();

    if (!alerts || !Array.isArray(alerts) || alerts.length === 0) {
      return NextResponse.json(
        { error: 'No low stock items to generate shopping list from' },
        { status: 400 }
      );
    }

    // Build a lookup from items (includes category, cost, etc.)
    const itemMap: Record<string, { category: string; cost: number | null; sku: string; unitOfMeasure: string; manufacturer: string; partNumber: string }> = {};
    if (Array.isArray(items)) {
      for (const item of items) {
        itemMap[item.id] = {
          category: item.category || 'material',
          cost: item.cost || null,
          sku: item.sku || '',
          unitOfMeasure: item.unitOfMeasure || 'each',
          manufacturer: item.manufacturer || '',
          partNumber: item.partNumber || '',
        };
      }
    }

    // Enrich alerts with item data
    const enrichedAlerts = alerts.map((alert: {
      itemId: string;
      itemName: string;
      locationName: string;
      currentQuantity: number;
      parLevel: number;
      shortage: number;
    }) => ({
      ...alert,
      ...(itemMap[alert.itemId] || {}),
    }));

    const prompt = `You are an inventory management assistant for ${tenant.appName}. Analyze the following low stock items (materials and tools) and generate an optimized shopping/order list.

LOW STOCK ITEMS:
${JSON.stringify(enrichedAlerts, null, 2)}

Generate a JSON response with this exact structure (no markdown, just raw JSON):
{
  "items": [
    {
      "itemName": "Item Name",
      "category": "material",
      "sku": "SKU or empty string",
      "currentQuantity": 0,
      "parLevel": 10,
      "orderQuantity": 12,
      "unitOfMeasure": "each",
      "estimatedCost": 59.99,
      "priority": "critical",
      "locationName": "Location Name",
      "notes": "Brief note about why this quantity"
    }
  ],
  "summary": "Brief 1-2 sentence summary of the order",
  "totalEstimatedCost": 299.99
}

RULES:
- Each item has a "category" field: "material" or "tool" — preserve from input data
- Order quantity should bring stock to par level PLUS a 20% buffer (round up to whole numbers)
- Priority levels: "critical" = at 0 or has 25% or less of par, "low" = has 26-50% of par, "restock" = has 51-99% of par
- If cost per unit is known, calculate estimatedCost = orderQuantity * cost. If cost is null, set estimatedCost to null
- totalEstimatedCost = sum of all non-null estimatedCost values, or null if all are null
- Group by priority (critical first, then low, then restock)
- Keep notes short and actionable (e.g. "Critical - completely out" or "Order extra, high turnover location")
- Return ONLY valid JSON, no other text`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0];
    if (text.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected AI response' }, { status: 500 });
    }

    // Parse the JSON response from Claude
    let parsed: ShoppingListResponse;
    try {
      // Strip any markdown code fences if present
      const cleaned = text.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse AI response:', text.text);
      return NextResponse.json({ error: 'Failed to parse AI shopping list' }, { status: 500 });
    }

    parsed.generatedAt = new Date().toISOString();

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Shopping list API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate shopping list' },
      { status: 500 }
    );
  }
}

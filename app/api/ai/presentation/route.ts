import { NextRequest, NextResponse } from 'next/server';
import { verifyFirebaseAuth, hasRole } from '@/lib/auth/verifyRequest';
import Anthropic from '@anthropic-ai/sdk';
import { ReportConfig, ReportResult } from '@/types/report';

// ============================================================
// POST /api/ai/presentation
// Generate structured slide content from report data using Claude
// ============================================================

export interface PresentationSlideContent {
  title: string;
  subtitle: string;
  executiveSummary: string[];   // 3 bullet points
  kpiNarratives: { label: string; value: string; narrative: string }[];
  insights: string[];           // 3 key insights
  recommendations: string[];    // 3 action items
  closingStatement: string;
}

const client = new Anthropic();

export async function POST(request: NextRequest) {
  const auth = await verifyFirebaseAuth(request);
  if (!auth.authenticated || !hasRole(auth.role, ['owner', 'admin', 'pm', 'sales_rep'])) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { config: ReportConfig; result: ReportResult; prompt: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { config, result, prompt } = body;
  if (!config || !result || !prompt?.trim()) {
    return NextResponse.json({ error: 'Missing config, result, or prompt' }, { status: 400 });
  }

  // Build a compact data summary to pass to Claude
  const metricLabels = config.metrics.map((m) => m.label);
  const totalsText = Object.entries(result.totals)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');
  const groupedRows = result.data.slice(0, 20); // cap to avoid token bloat
  const rowsText = groupedRows
    .map((row) =>
      Object.entries(row)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ')
    )
    .join('\n');

  const systemPrompt = `You are a business intelligence analyst who creates executive PowerPoint presentations.
You receive report data and a user prompt, and return structured slide content as JSON.

IMPORTANT: This content will be exported as an editable .pptx PowerPoint file with native charts (bar, donut, line).
Design your content for PowerPoint slide constraints:
- Titles: punchy, max 8 words — they appear in large bold text on dark header bars
- KPI values: use formatted numbers ($12.5K, 87%, 142) — they render at 30pt font in card layouts
- Narratives: 1 short sentence per KPI — these appear in small text below each metric card
- Bullets: max 2 lines each — they display with accent-colored markers on white slides
- Insights/recommendations: concise, action-oriented, max 2 sentences each — displayed in side-by-side columns

Be data-driven. Use the actual numbers from the report. Make every word count for slide readability.
Always return valid JSON matching the exact schema requested — no extra keys, no markdown fences.`;

  const userMessage = `Report: "${config.name}"
Date range: ${config.dateRange.start} to ${config.dateRange.end}
Metrics: ${metricLabels.join(', ')}
Totals: ${totalsText}
${config.groupBy ? `Grouped by: ${config.groupBy}` : ''}
${rowsText ? `Data rows:\n${rowsText}` : ''}

User presentation prompt: "${prompt}"

Return a JSON object with exactly these fields:
{
  "title": "short deck title (max 8 words)",
  "subtitle": "subtitle or tagline (max 12 words)",
  "executiveSummary": ["bullet 1", "bullet 2", "bullet 3"],
  "kpiNarratives": [
    { "label": "metric name", "value": "formatted value", "narrative": "1-sentence context" }
  ],
  "insights": ["insight 1", "insight 2", "insight 3"],
  "recommendations": ["action 1", "action 2", "action 3"],
  "closingStatement": "one strong closing sentence for the deck"
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '';
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    const slideContent: PresentationSlideContent = JSON.parse(cleaned);

    return NextResponse.json({ slideContent });
  } catch (err) {
    console.error('AI presentation generation failed:', err);
    return NextResponse.json({ error: 'Failed to generate presentation content' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth, isInternal } from '@/lib/auth/verifyRequest';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `You are an AI assistant for KeyHub Central, a business management platform that manages three interconnected companies:

1. **Keynote Digital (KD)** - Lead generation & marketing subscriptions
   - Generates leads via Google Ads, Meta, TikTok campaigns
   - Offers subscription tiers: Starter ($399), Growth ($899), Pro ($1,499+)
   - Tracks cost per lead (CPL) and campaign performance

2. **Key Trade Solutions (KTS)** - 1099 contractor network
   - Manages installers, sales reps, project managers, service techs
   - Rating tiers: Elite (10% commission), Pro (9%), Standard (8%)
   - Handles onboarding, W-9, insurance, ACH payments

3. **Key Renovations (KR)** - D2C home renovation sales
   - Job types: bathroom, kitchen, exterior renovations
   - Job stages: Lead → Sold → Front End Hold → Production → Scheduled → Started → Complete → Paid in Full
   - Tracks costs (material, labor) and margins

**Business Flow:**
- KD generates leads → sent to KR for sales
- KR sells jobs → KTS provides contractors to execute
- Revenue flows back through all three entities

**Your Role:**
- Answer questions about business metrics, performance, and trends
- Help users understand their data and make decisions
- Provide insights about leads, jobs, contractors, invoices
- Be concise and business-focused
- Use specific numbers when available from context
- If you don't have specific data, explain what metrics would be helpful

Keep responses concise and actionable. Use bullet points for clarity.`;

export async function POST(request: NextRequest) {
  // Verify authentication - only internal users can use chat
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
    const { messages, context } = await request.json();

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI chat is not configured. Please add ANTHROPIC_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    // Build context-aware system prompt
    let systemPrompt = SYSTEM_PROMPT;
    if (context) {
      systemPrompt += `\n\n**Current Business Context:**\n${JSON.stringify(context, null, 2)}`;
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((msg: { role: string; content: string }) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
    });

    const assistantMessage = response.content[0];
    if (assistantMessage.type !== 'text') {
      return NextResponse.json(
        { error: 'Unexpected response type' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: assistantMessage.text,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}

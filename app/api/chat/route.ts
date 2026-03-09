import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { verifyFirebaseAuth, isInternal } from '@/lib/auth/verifyRequest';
import { getChatContextForUser } from '@/lib/firebase/chatContext';
import { getAdminDb } from '@/lib/firebase/admin';
import { UserRole } from '@/types/user';
import { ChatContext } from '@/types/chat';
import { tenant } from '@/lib/config/tenant';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const BASE_SYSTEM_PROMPT = `You are an AI assistant for ${tenant.appName}, a business management platform that manages three interconnected companies:

1. **${tenant.entities.kd.label} (${tenant.entities.kd.shortLabel})** - Lead generation & marketing subscriptions
   - Generates leads via Google Ads, Meta, TikTok campaigns
   - Offers subscription tiers: Starter ($${tenant.subscriptionTiers.starter.monthlyFee}), Growth ($${tenant.subscriptionTiers.growth.monthlyFee}), Pro ($${tenant.subscriptionTiers.pro.monthlyFee}+)
   - Tracks cost per lead (CPL) and campaign performance

2. **${tenant.entities.kts.label} (${tenant.entities.kts.shortLabel})** - 1099 contractor network
   - Manages installers, sales reps, project managers, service techs
   - Rating tiers: Elite (${Math.round(tenant.commissionRates.elite * 100)}% commission), Pro (${Math.round(tenant.commissionRates.pro * 100)}%), Standard (${Math.round(tenant.commissionRates.standard * 100)}%)
   - Handles onboarding, W-9, insurance, ACH payments

3. **${tenant.entities.kr.label} (${tenant.entities.kr.shortLabel})** - D2C home renovation sales
   - Job types: bathroom, kitchen, exterior renovations
   - Job stages: Lead → Sold → Front End Hold → Production → Scheduled → Started → Complete → Paid in Full
   - Tracks costs (material, labor) and margins

**Business Flow:**
- ${tenant.entities.kd.shortLabel} generates leads → sent to ${tenant.entities.kr.shortLabel} for sales
- ${tenant.entities.kr.shortLabel} sells jobs → ${tenant.entities.kts.shortLabel} provides contractors to execute
- Revenue flows back through all three entities`;

function buildSystemPrompt(context: ChatContext): string {
  let prompt = BASE_SYSTEM_PROMPT;

  // Add current date/time context
  const currentDate = new Date(context.timestamp);
  const formattedDate = currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  prompt += `\n\n---\n\n**Current Date:** ${formattedDate}`;
  prompt += `\n**User:** ${context.user.name} (${context.user.role})`;

  prompt += `\n\n**YOUR BUSINESS DATA:**\n`;

  // Add jobs data if available
  if (context.jobs) {
    prompt += `\n**Jobs:**`;
    prompt += `\n- Total jobs: ${context.jobs.total}`;
    prompt += `\n- By status: ${Object.entries(context.jobs.byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
    prompt += `\n- Revenue this month: $${context.jobs.revenueThisMonth.toLocaleString()}`;
    if (context.jobs.recentJobs.length > 0) {
      prompt += `\n- Recent jobs:`;
      context.jobs.recentJobs.forEach(job => {
        prompt += `\n  • ${job.jobNumber} - ${job.customer} (${job.status}, ${job.type}, $${job.value.toLocaleString()})`;
      });
    }
  }

  // Add leads data if available
  if (context.leads) {
    prompt += `\n\n**Leads:**`;
    prompt += `\n- Total leads: ${context.leads.total}`;
    prompt += `\n- By status: ${Object.entries(context.leads.byStatus).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
    prompt += `\n- New this month: ${context.leads.thisMonth}`;
    prompt += `\n- Conversion rate: ${context.leads.conversionRate}%`;
    if (context.leads.recentLeads.length > 0) {
      prompt += `\n- Recent leads:`;
      context.leads.recentLeads.forEach(lead => {
        prompt += `\n  • ${lead.name} (${lead.source}, ${lead.status}, ${lead.quality})`;
      });
    }
  }

  // Add invoices data if available
  if (context.invoices) {
    prompt += `\n\n**Invoices:**`;
    prompt += `\n- Outstanding amount: $${context.invoices.outstanding.toLocaleString()}`;
    prompt += `\n- Overdue: ${context.invoices.overdueCount} invoices ($${context.invoices.overdueAmount.toLocaleString()})`;
    prompt += `\n- Paid this month: $${context.invoices.paidThisMonth.toLocaleString()}`;
    if (context.invoices.recentInvoices.length > 0) {
      prompt += `\n- Recent invoices:`;
      context.invoices.recentInvoices.forEach(inv => {
        prompt += `\n  • #${inv.number} - $${inv.amount.toLocaleString()} (${inv.status}, due: ${inv.dueDate})`;
      });
    }
  }

  // Add contractors data if available
  if (context.contractors) {
    prompt += `\n\n**Contractors:**`;
    prompt += `\n- Active: ${context.contractors.active}`;
    prompt += `\n- Pending approval: ${context.contractors.pending}`;
    prompt += `\n- By trade: ${Object.entries(context.contractors.byTrade).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
  }

  // Add campaigns data if available
  if (context.campaigns) {
    prompt += `\n\n**Campaigns:**`;
    prompt += `\n- Active campaigns: ${context.campaigns.active}`;
    prompt += `\n- Total ad spend: $${context.campaigns.totalSpend.toLocaleString()}`;
    prompt += `\n- Leads generated: ${context.campaigns.leadsGenerated}`;
    prompt += `\n- Average CPL: $${context.campaigns.avgCPL.toFixed(2)}`;
  }

  // Add commissions data if available (for sales reps)
  if (context.commissions) {
    prompt += `\n\n**Your Commissions:**`;
    prompt += `\n- Pending amount: $${context.commissions.pendingAmount.toLocaleString()} (${context.commissions.pendingCount} jobs)`;
    prompt += `\n- Paid this month: $${context.commissions.paidThisMonth.toLocaleString()}`;
  }

  // Add contractor-specific job data if available
  if (context.myJobs) {
    prompt += `\n\n**Your Jobs:**`;
    prompt += `\n- Assigned jobs: ${context.myJobs.assigned}`;
    prompt += `\n- In progress: ${context.myJobs.inProgress}`;
    prompt += `\n- Completed this month: ${context.myJobs.completedThisMonth}`;
    if (context.myJobs.upcomingJobs.length > 0) {
      prompt += `\n- Upcoming scheduled:`;
      context.myJobs.upcomingJobs.forEach(job => {
        prompt += `\n  • ${job.jobNumber} - ${job.customer} (${job.type}, ${job.scheduledDate || 'TBD'})`;
      });
    }
  }

  // Add contractor-specific invoice data if available
  if (context.myInvoices) {
    prompt += `\n\n**Your Invoices:**`;
    prompt += `\n- Pending: ${context.myInvoices.pending} ($${context.myInvoices.pendingAmount.toLocaleString()})`;
    prompt += `\n- Paid this month: $${context.myInvoices.paidThisMonth.toLocaleString()}`;
  }

  prompt += `\n\n---\n\n**INSTRUCTIONS:**
- Use the specific data above to answer questions accurately
- When asked about trends, compare current numbers to expectations
- Reference specific job numbers, customer names, and amounts when relevant
- If data for a specific question isn't available in the context, say so clearly
- Be concise and business-focused
- Use bullet points for clarity
- Format currency values with dollar signs and commas`;

  return prompt;
}

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
    const { messages } = await request.json();

    // Validate message array bounds
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (messages.length > 50) {
      return NextResponse.json(
        { error: 'Too many messages. Please start a new conversation.' },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'AI chat is not configured. Please add ANTHROPIC_API_KEY to environment variables.' },
        { status: 500 }
      );
    }

    // Get user display name from Firestore
    const db = getAdminDb();
    const userDoc = await db.collection('users').doc(auth.user!.uid).get();
    const userData = userDoc.data();
    const userName = userData?.displayName || auth.user!.email || 'User';

    // Fetch user-specific context data
    const context = await getChatContextForUser(
      auth.user!.uid,
      userName,
      auth.role as UserRole
    );

    // Build the enhanced system prompt with real data
    const systemPrompt = buildSystemPrompt(context);

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

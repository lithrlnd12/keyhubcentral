// SMS AI Conversation Handler using Claude

import Anthropic from '@anthropic-ai/sdk';
import { SmsAnalysis } from '@/types/lead';

// Generic message type that works with both client and admin Firebase SDKs
interface ConversationMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp?: unknown; // Accept any timestamp type
}

// System prompt for Riley (SMS version - optimized for short messages)
const SMS_SYSTEM_PROMPT = `You are Riley, a friendly text message assistant from Key Trade Solutions, texting on behalf of Key Renovations.

IMPORTANT SMS RULES:
- Keep messages SHORT (under 160 characters when possible, max 300)
- Be conversational and warm
- Ask ONE question at a time
- Don't sound robotic or scripted
- Use casual punctuation, but stay professional

About Key Renovations:
- We specialize in cost-effective home and rental property renovations
- We serve the Oklahoma City area
- Services: kitchens, bathrooms, flooring, general renovations
- We offer FREE quotes and in-home consultations

Your goals (gather ONE at a time):
1. Confirm you're texting the right person
2. Ask what type of project they're interested in
3. Ask if this is for their personal home or rental property
4. Get a brief idea of what they want done
5. Ask about their timeline
6. Let them know a specialist will reach out for a FREE consultation

If they say "STOP", "unsubscribe", or want to be removed, respect that IMMEDIATELY and say goodbye politely.

If they seem uninterested or busy, offer to text back at a better time.

Be warm and genuine - you're from Oklahoma!`;

// Analysis prompt to extract structured data from conversation
const ANALYSIS_PROMPT = `Analyze this SMS conversation and extract the following information. Return ONLY valid JSON, no markdown or explanation.

{
  "conversationOutcome": "completed" | "in_progress" | "unresponsive" | "opted_out",
  "interestLevel": "high" | "medium" | "low" | "not_interested" | null,
  "projectType": "kitchen" | "bathroom" | "flooring" | "exterior" | "other" | null,
  "propertyType": "personal_home" | "rental_property" | "commercial" | null,
  "timeline": string or null (e.g., "this month", "1-3 months", "just looking"),
  "projectDescription": string or null (brief description of what they want),
  "confirmedContactInfo": boolean,
  "requestedCallback": boolean,
  "removeFromList": boolean
}

If information wasn't discussed or is unclear, use null. Be conservative - only mark as "completed" if you have project type and timeline at minimum.`;

function getAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY environment variable is not set');
  }
  return new Anthropic({ apiKey });
}

// Generate next SMS response based on conversation history
export async function generateSmsResponse(
  customerName: string,
  conversationHistory: ConversationMessage[],
  leadContext?: { notes?: string }
): Promise<{ message: string; shouldEnd: boolean }> {
  const anthropic = getAnthropicClient();

  // Build context string
  let contextInfo = `Customer Name: ${customerName}`;
  if (leadContext?.notes) {
    contextInfo += `\nNotes from form: ${leadContext.notes}`;
  }

  // Convert messages to Anthropic format
  const messages = conversationHistory.map((msg) => ({
    role: msg.role as 'user' | 'assistant',
    content: msg.content,
  }));

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300, // Keep SMS short
    system: `${SMS_SYSTEM_PROMPT}\n\nCurrent context:\n${contextInfo}`,
    messages,
  });

  const assistantMessage = response.content[0];
  if (assistantMessage.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  const text = assistantMessage.text;

  // Check if conversation should end
  const shouldEnd =
    text.toLowerCase().includes('have a great day') ||
    text.toLowerCase().includes('talk soon') ||
    text.toLowerCase().includes('goodbye') ||
    text.toLowerCase().includes('removed from') ||
    text.toLowerCase().includes('opted out') ||
    conversationHistory.length >= 20; // Max 10 exchanges

  return {
    message: text,
    shouldEnd,
  };
}

// Generate initial outreach message
export function getInitialMessage(customerName: string): string {
  const firstName = customerName.split(' ')[0];
  return `Hi ${firstName}! This is Riley from Key Renovations. Thanks for your interest in our services! What type of project are you thinking about? (kitchen, bathroom, flooring, or something else?)`;
}

// Analyze conversation and extract structured data
export async function analyzeConversation(
  conversationHistory: ConversationMessage[]
): Promise<SmsAnalysis> {
  const anthropic = getAnthropicClient();

  // Format conversation for analysis
  const conversationText = conversationHistory
    .map((msg) => `${msg.role === 'assistant' ? 'Riley' : 'Customer'}: ${msg.content}`)
    .join('\n');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    system: 'You are a data extraction assistant. Extract structured data from conversations. Return only valid JSON.',
    messages: [
      {
        role: 'user',
        content: `${ANALYSIS_PROMPT}\n\nConversation:\n${conversationText}`,
      },
    ],
  });

  const assistantMessage = response.content[0];
  if (assistantMessage.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  try {
    // Parse JSON response
    const jsonText = assistantMessage.text.trim();
    const analysis = JSON.parse(jsonText) as SmsAnalysis;
    return analysis;
  } catch (error) {
    console.error('Failed to parse analysis JSON:', assistantMessage.text);
    // Return default analysis on parse error
    return {
      conversationOutcome: 'in_progress',
      interestLevel: undefined,
      projectType: undefined,
    };
  }
}

// Check if customer wants to opt out
export function checkOptOut(message: string): boolean {
  const optOutPhrases = [
    'stop',
    'unsubscribe',
    'remove me',
    'take me off',
    'opt out',
    'leave me alone',
    'dont text',
    "don't text",
    'no more',
    'quit texting',
  ];

  const lowerMessage = message.toLowerCase();
  return optOutPhrases.some((phrase) => lowerMessage.includes(phrase));
}

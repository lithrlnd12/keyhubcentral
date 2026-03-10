// VAPI Assistant Management — programmatic create/update of assistants

import { VapiToolConfig, getVapiToolConfigs } from './toolRegistry';

const VAPI_API_URL = 'https://api.vapi.ai';

function getApiKey(): string {
  const apiKey = process.env.VAPI_API_KEY;
  if (!apiKey) throw new Error('VAPI_API_KEY environment variable is not set');
  return apiKey;
}

export interface AssistantConfig {
  name: string;
  model: {
    provider: string;
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    tools?: VapiToolConfig[];
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  firstMessage?: string;
  endCallMessage?: string;
  transferPlan?: {
    mode: 'server-message';
  };
  silenceTimeoutSeconds?: number;
  maxDurationSeconds?: number;
  [key: string]: unknown;
}

/**
 * Create a new VAPI assistant
 */
export async function createAssistant(config: AssistantConfig): Promise<string> {
  const response = await fetch(`${VAPI_API_URL}/assistant`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create assistant: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.id;
}

/**
 * Update an existing VAPI assistant
 */
export async function updateAssistant(
  id: string,
  updates: Partial<AssistantConfig>
): Promise<void> {
  const response = await fetch(`${VAPI_API_URL}/assistant/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update assistant: ${response.status} ${error}`);
  }
}

/**
 * Get a VAPI assistant's current config
 */
export async function getAssistant(id: string): Promise<AssistantConfig & { id: string }> {
  const response = await fetch(`${VAPI_API_URL}/assistant/${id}`, {
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get assistant: ${response.status}`);
  }

  return response.json();
}

/**
 * Get VAPI tool config array from registered tool names
 */
export function getToolsConfig(toolNames: string[]): VapiToolConfig[] {
  return getVapiToolConfigs(toolNames);
}

/**
 * Create an outbound call with assistant overrides
 */
export async function createOutboundCallWithAssistant(options: {
  assistantId: string;
  phoneNumberId: string;
  customerNumber: string;
  customerName?: string;
  assistantOverrides?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string }> {
  const response = await fetch(`${VAPI_API_URL}/call/phone`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      assistantId: options.assistantId,
      phoneNumberId: options.phoneNumberId,
      customer: {
        number: options.customerNumber,
        name: options.customerName,
      },
      assistantOverrides: options.assistantOverrides,
      metadata: options.metadata,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create outbound call: ${response.status} ${error}`);
  }

  return response.json();
}

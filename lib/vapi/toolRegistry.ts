// VAPI Tool Registry — centralized mapping of tool names to handlers

export interface CallContext {
  callId: string;
  callerPhone?: string;
  callType: 'inbound' | 'outbound';
  metadata?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema for VAPI
  handler: (params: Record<string, unknown>, ctx: CallContext) => Promise<unknown>;
}

// Global tool registry
const toolRegistry = new Map<string, ToolDefinition>();

export function registerTool(tool: ToolDefinition): void {
  toolRegistry.set(tool.name, tool);
}

export function getTool(name: string): ToolDefinition | undefined {
  return toolRegistry.get(name);
}

export function getAllTools(): ToolDefinition[] {
  return Array.from(toolRegistry.values());
}

export function getToolsByNames(names: string[]): ToolDefinition[] {
  return names
    .map((name) => toolRegistry.get(name))
    .filter((t): t is ToolDefinition => t !== undefined);
}

/**
 * Convert registered tools to VAPI tool config format
 */
export function getVapiToolConfigs(toolNames: string[]): VapiToolConfig[] {
  return getToolsByNames(toolNames).map((tool) => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'object',
        properties: tool.parameters,
        required: Object.keys(tool.parameters),
      },
    },
  }));
}

export interface VapiToolConfig {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Execute a tool by name with given parameters and context
 */
export async function executeTool(
  name: string,
  params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const tool = toolRegistry.get(name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.handler(params, ctx);
}

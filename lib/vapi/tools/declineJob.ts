// VAPI Tool: declineJob — called by the dispatch assistant when a contractor declines

import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';
import { handleDispatchResponse } from '@/lib/vapi/dispatch';

async function declineJobHandler(
  params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const sessionId = ctx.metadata?.dispatchSessionId as string | undefined;
  const contractorId = ctx.metadata?.contractorId as string | undefined;

  if (!sessionId || !contractorId) {
    throw new Error(
      'Missing dispatchSessionId or contractorId in call metadata'
    );
  }

  const reason = (params.reason as string) || undefined;

  // Log the decline reason if provided
  if (reason) {
    console.log(
      `Contractor ${contractorId} declined dispatch ${sessionId}: ${reason}`
    );
  }

  await handleDispatchResponse(sessionId, contractorId, false);

  return {
    success: true,
    message: "No problem, we'll find someone else.",
  };
}

registerTool({
  name: 'declineJob',
  description:
    'Decline a job assignment on behalf of the contractor during a dispatch call.',
  parameters: {
    reason: {
      type: 'string',
      description: 'Optional reason the contractor declined the job',
    },
  },
  handler: declineJobHandler,
});

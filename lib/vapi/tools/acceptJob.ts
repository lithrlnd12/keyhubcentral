// VAPI Tool: acceptJob — called by the dispatch assistant when a contractor accepts

import { registerTool, CallContext } from '@/lib/vapi/toolRegistry';
import { handleDispatchResponse } from '@/lib/vapi/dispatch';

async function acceptJobHandler(
  _params: Record<string, unknown>,
  ctx: CallContext
): Promise<unknown> {
  const sessionId = ctx.metadata?.dispatchSessionId as string | undefined;
  const contractorId = ctx.metadata?.contractorId as string | undefined;

  if (!sessionId || !contractorId) {
    throw new Error(
      'Missing dispatchSessionId or contractorId in call metadata'
    );
  }

  await handleDispatchResponse(sessionId, contractorId, true);

  return {
    success: true,
    message: "Great, you've been assigned to this job!",
  };
}

registerTool({
  name: 'acceptJob',
  description:
    'Accept a job assignment on behalf of the contractor during a dispatch call.',
  parameters: {},
  handler: acceptJobHandler,
});

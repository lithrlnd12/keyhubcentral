import { registerTool } from '@/lib/vapi/toolRegistry';

async function getCurrentDateTimeHandler(): Promise<unknown> {
  const now = new Date();
  const eastern = now.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const date = now.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }); // YYYY-MM-DD
  const dayOfWeek = now.toLocaleDateString('en-US', { timeZone: 'America/New_York', weekday: 'long' });

  return {
    date,
    dayOfWeek,
    dateTime: eastern,
    timezone: 'America/New_York',
  };
}

registerTool({
  name: 'getCurrentDateTime',
  description: 'Get the current date and time. Call this before scheduling or discussing dates.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
  handler: getCurrentDateTimeHandler,
});

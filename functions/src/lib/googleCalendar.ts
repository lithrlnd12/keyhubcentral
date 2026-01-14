// Dynamic import to avoid deployment timeout
import type { calendar_v3 } from 'googleapis';
import * as admin from 'firebase-admin';

// Status titles for calendar events
export const CALENDAR_EVENT_TITLES: Record<string, string> = {
  busy: 'Busy - KeyHub',
  unavailable: 'Unavailable - KeyHub',
  on_leave: 'On Leave - KeyHub',
};

// Time block configuration (must match frontend types/availability.ts)
export type TimeBlock = 'am' | 'pm' | 'evening';

export const TIME_BLOCK_CONFIG = {
  am: { start: 6, end: 12, label: 'Morning' },
  pm: { start: 12, end: 18, label: 'Afternoon' },
  evening: { start: 18, end: 22, label: 'Evening' },
} as const;

export const TIME_BLOCKS: TimeBlock[] = ['am', 'pm', 'evening'];

// Marker to identify our events
export const KEYHUB_EVENT_MARKER = 'Synced from KeyHub Central';

// Get OAuth2 client with user's tokens (async to support dynamic import)
async function getOAuth2Client() {
  const { google } = await import('googleapis');

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Google Calendar OAuth credentials not configured');
  }

  return new google.auth.OAuth2(clientId, clientSecret);
}

// Get authenticated calendar client for a user
export async function getCalendarClient(
  userId: string
): Promise<calendar_v3.Calendar | null> {
  const db = admin.firestore();
  const integrationDoc = await db
    .collection('users')
    .doc(userId)
    .collection('integrations')
    .doc('googleCalendar')
    .get();

  if (!integrationDoc.exists) {
    return null;
  }

  const integration = integrationDoc.data();
  if (!integration || !integration.enabled) {
    return null;
  }

  const oauth2Client = await getOAuth2Client();

  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    expiry_date: integration.expiresAt?.toMillis?.() || null,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (tokens.access_token) {
        updateData.accessToken = tokens.access_token;
      }
      if (tokens.expiry_date) {
        updateData.expiresAt = admin.firestore.Timestamp.fromMillis(
          tokens.expiry_date
        );
      }

      await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('googleCalendar')
        .update(updateData);
    } catch (error) {
      console.error('Error updating tokens for user:', userId, error);
    }
  });

  // Dynamic import for calendar
  const { google } = await import('googleapis');
  return google.calendar({ version: 'v3', auth: oauth2Client });
}

// Create an all-day event for availability status (legacy - for backward compatibility)
export async function createAvailabilityEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  date: string, // YYYY-MM-DD format
  status: string
): Promise<string | null> {
  const title = CALENDAR_EVENT_TITLES[status];
  if (!title) {
    return null;
  }

  try {
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: title,
        description: KEYHUB_EVENT_MARKER,
        start: { date },
        end: { date },
        transparency: 'opaque', // Show as busy
      },
    });

    return event.data.id || null;
  } catch (error) {
    console.error('Error creating calendar event:', error);
    throw error;
  }
}

// Create a timed event for a specific time block
export async function createBlockAvailabilityEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  date: string, // YYYY-MM-DD format
  block: TimeBlock,
  status: string,
  timezone: string = 'America/New_York'
): Promise<string | null> {
  const title = CALENDAR_EVENT_TITLES[status];
  if (!title) {
    return null;
  }

  const config = TIME_BLOCK_CONFIG[block];
  const startHour = config.start.toString().padStart(2, '0');
  const endHour = config.end.toString().padStart(2, '0');

  try {
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `${title} (${config.label})`,
        description: `${KEYHUB_EVENT_MARKER}\nBlock: ${block}`,
        start: {
          dateTime: `${date}T${startHour}:00:00`,
          timeZone: timezone,
        },
        end: {
          dateTime: `${date}T${endHour}:00:00`,
          timeZone: timezone,
        },
        transparency: 'opaque', // Show as busy
      },
    });

    return event.data.id || null;
  } catch (error) {
    console.error(`Error creating calendar event for block ${block}:`, error);
    throw error;
  }
}

// Update an existing block availability event
export async function updateBlockAvailabilityEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
  block: TimeBlock,
  status: string
): Promise<void> {
  const title = CALENDAR_EVENT_TITLES[status];
  if (!title) {
    return;
  }

  const config = TIME_BLOCK_CONFIG[block];

  try {
    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: `${title} (${config.label})`,
      },
    });
  } catch (error) {
    console.error(`Error updating calendar event for block ${block}:`, error);
    throw error;
  }
}

// Update an existing calendar event
export async function updateAvailabilityEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
  status: string
): Promise<void> {
  const title = CALENDAR_EVENT_TITLES[status];
  if (!title) {
    return;
  }

  try {
    await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: {
        summary: title,
      },
    });
  } catch (error) {
    console.error('Error updating calendar event:', error);
    throw error;
  }
}

// Delete a calendar event
export async function deleteAvailabilityEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string
): Promise<void> {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error: unknown) {
    // Ignore 404 errors (event already deleted)
    if (error && typeof error === 'object' && 'code' in error && (error as { code: number }).code === 404) {
      return;
    }
    console.error('Error deleting calendar event:', error);
    throw error;
  }
}

// Get events from Google Calendar for a date range
export async function getCalendarEvents(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<calendar_v3.Schema$Event[]> {
  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250, // Max per request
    });

    return response.data.items || [];
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    throw error;
  }
}

// Check if an event was created by KeyHub
export function isKeyHubEvent(event: calendar_v3.Schema$Event): boolean {
  return event.description?.includes(KEYHUB_EVENT_MARKER) || false;
}

// Extract date from event (handles all-day and timed events)
export function getEventDate(event: calendar_v3.Schema$Event): string | null {
  // All-day events have start.date
  if (event.start?.date) {
    return event.start.date;
  }

  // Timed events have start.dateTime
  if (event.start?.dateTime) {
    return event.start.dateTime.split('T')[0];
  }

  return null;
}

// Check if event is busy (shows as busy in calendar)
export function isEventBusy(event: calendar_v3.Schema$Event): boolean {
  // transparent = free, opaque = busy (default)
  return event.transparency !== 'transparent';
}

// Get time blocks that an event overlaps with
export function getEventTimeBlocks(event: calendar_v3.Schema$Event): TimeBlock[] {
  // All-day events affect all blocks
  if (event.start?.date) {
    return [...TIME_BLOCKS];
  }

  // Timed events - check which blocks they overlap
  if (!event.start?.dateTime || !event.end?.dateTime) {
    return [];
  }

  const startTime = new Date(event.start.dateTime);
  const endTime = new Date(event.end.dateTime);
  const startHour = startTime.getHours();
  const endHour = endTime.getHours() + (endTime.getMinutes() > 0 ? 1 : 0);

  const blocks: TimeBlock[] = [];

  for (const block of TIME_BLOCKS) {
    const config = TIME_BLOCK_CONFIG[block];
    // Check if event overlaps with this block
    if (startHour < config.end && endHour > config.start) {
      blocks.push(block);
    }
  }

  return blocks;
}

// Extract block from KeyHub event description
export function getBlockFromEventDescription(event: calendar_v3.Schema$Event): TimeBlock | null {
  if (!event.description) return null;

  const match = event.description.match(/Block: (am|pm|evening)/);
  return match ? (match[1] as TimeBlock) : null;
}

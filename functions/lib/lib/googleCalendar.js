"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYHUB_EVENT_MARKER = exports.TIME_BLOCKS = exports.TIME_BLOCK_CONFIG = exports.CALENDAR_EVENT_TITLES = void 0;
exports.getCalendarClient = getCalendarClient;
exports.createAvailabilityEvent = createAvailabilityEvent;
exports.createBlockAvailabilityEvent = createBlockAvailabilityEvent;
exports.updateBlockAvailabilityEvent = updateBlockAvailabilityEvent;
exports.updateAvailabilityEvent = updateAvailabilityEvent;
exports.deleteAvailabilityEvent = deleteAvailabilityEvent;
exports.getCalendarEvents = getCalendarEvents;
exports.isKeyHubEvent = isKeyHubEvent;
exports.getEventDate = getEventDate;
exports.isEventBusy = isEventBusy;
exports.getEventTimeBlocks = getEventTimeBlocks;
exports.getBlockFromEventDescription = getBlockFromEventDescription;
const admin = require("firebase-admin");
// Status titles for calendar events
exports.CALENDAR_EVENT_TITLES = {
    busy: 'Busy - KeyHub',
    unavailable: 'Unavailable - KeyHub',
    on_leave: 'On Leave - KeyHub',
};
exports.TIME_BLOCK_CONFIG = {
    am: { start: 6, end: 12, label: 'Morning' },
    pm: { start: 12, end: 18, label: 'Afternoon' },
    evening: { start: 18, end: 22, label: 'Evening' },
};
exports.TIME_BLOCKS = ['am', 'pm', 'evening'];
// Marker to identify our events
exports.KEYHUB_EVENT_MARKER = 'Synced from KeyHub Central';
// Get OAuth2 client with user's tokens (async to support dynamic import)
async function getOAuth2Client() {
    const { google } = await Promise.resolve().then(() => require('googleapis'));
    const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('Google Calendar OAuth credentials not configured');
    }
    return new google.auth.OAuth2(clientId, clientSecret);
}
// Get authenticated calendar client for a user
async function getCalendarClient(userId) {
    var _a, _b;
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
        expiry_date: ((_b = (_a = integration.expiresAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a)) || null,
    });
    // Handle token refresh
    oauth2Client.on('tokens', async (tokens) => {
        try {
            const updateData = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            if (tokens.access_token) {
                updateData.accessToken = tokens.access_token;
            }
            if (tokens.expiry_date) {
                updateData.expiresAt = admin.firestore.Timestamp.fromMillis(tokens.expiry_date);
            }
            await db
                .collection('users')
                .doc(userId)
                .collection('integrations')
                .doc('googleCalendar')
                .update(updateData);
        }
        catch (error) {
            console.error('Error updating tokens for user:', userId, error);
        }
    });
    // Dynamic import for calendar
    const { google } = await Promise.resolve().then(() => require('googleapis'));
    return google.calendar({ version: 'v3', auth: oauth2Client });
}
// Create an all-day event for availability status (legacy - for backward compatibility)
async function createAvailabilityEvent(calendar, calendarId, date, // YYYY-MM-DD format
status) {
    const title = exports.CALENDAR_EVENT_TITLES[status];
    if (!title) {
        return null;
    }
    try {
        const event = await calendar.events.insert({
            calendarId,
            requestBody: {
                summary: title,
                description: exports.KEYHUB_EVENT_MARKER,
                start: { date },
                end: { date },
                transparency: 'opaque', // Show as busy
            },
        });
        return event.data.id || null;
    }
    catch (error) {
        console.error('Error creating calendar event:', error);
        throw error;
    }
}
// Create a timed event for a specific time block
async function createBlockAvailabilityEvent(calendar, calendarId, date, // YYYY-MM-DD format
block, status, timezone = 'America/New_York') {
    const title = exports.CALENDAR_EVENT_TITLES[status];
    if (!title) {
        return null;
    }
    const config = exports.TIME_BLOCK_CONFIG[block];
    const startHour = config.start.toString().padStart(2, '0');
    const endHour = config.end.toString().padStart(2, '0');
    try {
        const event = await calendar.events.insert({
            calendarId,
            requestBody: {
                summary: `${title} (${config.label})`,
                description: `${exports.KEYHUB_EVENT_MARKER}\nBlock: ${block}`,
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
    }
    catch (error) {
        console.error(`Error creating calendar event for block ${block}:`, error);
        throw error;
    }
}
// Update an existing block availability event
async function updateBlockAvailabilityEvent(calendar, calendarId, eventId, block, status) {
    const title = exports.CALENDAR_EVENT_TITLES[status];
    if (!title) {
        return;
    }
    const config = exports.TIME_BLOCK_CONFIG[block];
    try {
        await calendar.events.patch({
            calendarId,
            eventId,
            requestBody: {
                summary: `${title} (${config.label})`,
            },
        });
    }
    catch (error) {
        console.error(`Error updating calendar event for block ${block}:`, error);
        throw error;
    }
}
// Update an existing calendar event
async function updateAvailabilityEvent(calendar, calendarId, eventId, status) {
    const title = exports.CALENDAR_EVENT_TITLES[status];
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
    }
    catch (error) {
        console.error('Error updating calendar event:', error);
        throw error;
    }
}
// Delete a calendar event
async function deleteAvailabilityEvent(calendar, calendarId, eventId) {
    try {
        await calendar.events.delete({
            calendarId,
            eventId,
        });
    }
    catch (error) {
        // Ignore 404 errors (event already deleted)
        if (error && typeof error === 'object' && 'code' in error && error.code === 404) {
            return;
        }
        console.error('Error deleting calendar event:', error);
        throw error;
    }
}
// Get events from Google Calendar for a date range
async function getCalendarEvents(calendar, calendarId, timeMin, timeMax) {
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
    }
    catch (error) {
        console.error('Error fetching calendar events:', error);
        throw error;
    }
}
// Check if an event was created by KeyHub
function isKeyHubEvent(event) {
    var _a;
    return ((_a = event.description) === null || _a === void 0 ? void 0 : _a.includes(exports.KEYHUB_EVENT_MARKER)) || false;
}
// Extract date from event (handles all-day and timed events)
function getEventDate(event) {
    var _a, _b;
    // All-day events have start.date
    if ((_a = event.start) === null || _a === void 0 ? void 0 : _a.date) {
        return event.start.date;
    }
    // Timed events have start.dateTime
    if ((_b = event.start) === null || _b === void 0 ? void 0 : _b.dateTime) {
        return event.start.dateTime.split('T')[0];
    }
    return null;
}
// Check if event is busy (shows as busy in calendar)
function isEventBusy(event) {
    // transparent = free, opaque = busy (default)
    return event.transparency !== 'transparent';
}
// Get time blocks that an event overlaps with
function getEventTimeBlocks(event) {
    var _a, _b, _c;
    // All-day events affect all blocks
    if ((_a = event.start) === null || _a === void 0 ? void 0 : _a.date) {
        return [...exports.TIME_BLOCKS];
    }
    // Timed events - check which blocks they overlap
    if (!((_b = event.start) === null || _b === void 0 ? void 0 : _b.dateTime) || !((_c = event.end) === null || _c === void 0 ? void 0 : _c.dateTime)) {
        return [];
    }
    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end.dateTime);
    const startHour = startTime.getHours();
    const endHour = endTime.getHours() + (endTime.getMinutes() > 0 ? 1 : 0);
    const blocks = [];
    for (const block of exports.TIME_BLOCKS) {
        const config = exports.TIME_BLOCK_CONFIG[block];
        // Check if event overlaps with this block
        if (startHour < config.end && endHour > config.start) {
            blocks.push(block);
        }
    }
    return blocks;
}
// Extract block from KeyHub event description
function getBlockFromEventDescription(event) {
    if (!event.description)
        return null;
    const match = event.description.match(/Block: (am|pm|evening)/);
    return match ? match[1] : null;
}
//# sourceMappingURL=googleCalendar.js.map
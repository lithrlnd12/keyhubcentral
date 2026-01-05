"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KEYHUB_EVENT_MARKER = exports.CALENDAR_EVENT_TITLES = void 0;
exports.getCalendarClient = getCalendarClient;
exports.createAvailabilityEvent = createAvailabilityEvent;
exports.updateAvailabilityEvent = updateAvailabilityEvent;
exports.deleteAvailabilityEvent = deleteAvailabilityEvent;
exports.getCalendarEvents = getCalendarEvents;
exports.isKeyHubEvent = isKeyHubEvent;
exports.getEventDate = getEventDate;
exports.isEventBusy = isEventBusy;
const admin = require("firebase-admin");
// Status titles for calendar events
exports.CALENDAR_EVENT_TITLES = {
    busy: 'Busy - KeyHub',
    unavailable: 'Unavailable - KeyHub',
    on_leave: 'On Leave - KeyHub',
};
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
// Create an all-day event for availability status
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
//# sourceMappingURL=googleCalendar.js.map
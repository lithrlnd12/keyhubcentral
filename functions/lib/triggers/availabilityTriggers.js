"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onAvailabilityChange = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const googleCalendar_1 = require("../lib/googleCalendar");
const runtimeOpts = {
    secrets: ['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET'],
    timeoutSeconds: 60,
    memory: '256MB',
};
/**
 * Sync availability changes to Google Calendar
 *
 * When a contractor sets their availability (busy, unavailable, on_leave),
 * this trigger creates/updates/deletes corresponding Google Calendar events.
 */
exports.onAvailabilityChange = functions
    .runWith(runtimeOpts)
    .firestore.document('contractors/{contractorId}/availability/{dateKey}')
    .onWrite(async (change, context) => {
    const { contractorId, dateKey } = context.params;
    const db = admin.firestore();
    // Get contractor's userId
    const contractorDoc = await db
        .collection('contractors')
        .doc(contractorId)
        .get();
    if (!contractorDoc.exists) {
        console.log(`Contractor ${contractorId} not found, skipping sync`);
        return null;
    }
    const contractorData = contractorDoc.data();
    const userId = contractorData === null || contractorData === void 0 ? void 0 : contractorData.userId;
    if (!userId) {
        console.log(`Contractor ${contractorId} has no userId, skipping sync`);
        return null;
    }
    // Get calendar client
    const calendar = await (0, googleCalendar_1.getCalendarClient)(userId);
    if (!calendar) {
        // User hasn't connected their calendar, skip silently
        return null;
    }
    // Get integration for calendarId
    const integrationDoc = await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('googleCalendar')
        .get();
    const integration = integrationDoc.data();
    const calendarId = (integration === null || integration === void 0 ? void 0 : integration.calendarId) || 'primary';
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    // Skip if this change came from Google Calendar sync (prevent loops)
    if ((after === null || after === void 0 ? void 0 : after.syncSource) === 'google') {
        console.log(`Skipping sync for ${dateKey} - originated from Google`);
        return null;
    }
    try {
        // Document deleted or status changed to 'available'
        if (!after || after.status === 'available') {
            // Delete the calendar event if it exists
            if (before === null || before === void 0 ? void 0 : before.googleEventId) {
                await (0, googleCalendar_1.deleteAvailabilityEvent)(calendar, calendarId, before.googleEventId);
                console.log(`Deleted calendar event for ${dateKey}`);
            }
            return null;
        }
        // Check if this is a status we sync (not 'available')
        if (!googleCalendar_1.CALENDAR_EVENT_TITLES[after.status]) {
            console.log(`Status ${after.status} not syncable, skipping`);
            return null;
        }
        // If we already have an event ID and status changed, update it
        if (after.googleEventId && (before === null || before === void 0 ? void 0 : before.status) !== after.status) {
            await (0, googleCalendar_1.updateAvailabilityEvent)(calendar, calendarId, after.googleEventId, after.status);
            console.log(`Updated calendar event for ${dateKey} to ${after.status}`);
            return null;
        }
        // Create new event if we don't have one
        if (!after.googleEventId) {
            const eventId = await (0, googleCalendar_1.createAvailabilityEvent)(calendar, calendarId, dateKey, after.status);
            if (eventId) {
                // Store the event ID back in the document
                await change.after.ref.update({
                    googleEventId: eventId,
                    syncSource: 'app',
                });
                console.log(`Created calendar event ${eventId} for ${dateKey}`);
            }
        }
        return null;
    }
    catch (error) {
        console.error(`Error syncing availability for ${dateKey}:`, error);
        // Update sync status on error
        await db
            .collection('users')
            .doc(userId)
            .collection('integrations')
            .doc('googleCalendar')
            .update({
            lastSyncStatus: 'error',
            lastSyncError: error instanceof Error ? error.message : 'Unknown error',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return null;
    }
});
//# sourceMappingURL=availabilityTriggers.js.map
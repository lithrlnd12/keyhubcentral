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
 * Now handles time blocks (AM/PM/Evening) with separate events for each.
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
    // Get integration for calendarId and timezone
    const integrationDoc = await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('googleCalendar')
        .get();
    const integration = integrationDoc.data();
    const calendarId = (integration === null || integration === void 0 ? void 0 : integration.calendarId) || 'primary';
    const timezone = (integration === null || integration === void 0 ? void 0 : integration.timezone) || 'America/New_York';
    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;
    // Skip if this change came from Google Calendar sync (prevent loops)
    if ((after === null || after === void 0 ? void 0 : after.syncSource) === 'google') {
        console.log(`Skipping sync for ${dateKey} - originated from Google`);
        return null;
    }
    try {
        // Get block statuses (handle legacy format)
        const beforeBlocks = (before === null || before === void 0 ? void 0 : before.blocks) || ((before === null || before === void 0 ? void 0 : before.status) ? {
            am: before.status,
            pm: before.status,
            evening: before.status,
        } : null);
        const afterBlocks = (after === null || after === void 0 ? void 0 : after.blocks) || ((after === null || after === void 0 ? void 0 : after.status) ? {
            am: after.status,
            pm: after.status,
            evening: after.status,
        } : null);
        // Get existing event IDs
        const beforeEventIds = (before === null || before === void 0 ? void 0 : before.googleEventIds) || {};
        const afterEventIds = (after === null || after === void 0 ? void 0 : after.googleEventIds) || {};
        const updatedEventIds = Object.assign({}, afterEventIds);
        let hasUpdates = false;
        // Document deleted - delete all calendar events
        if (!after) {
            for (const block of googleCalendar_1.TIME_BLOCKS) {
                const eventId = beforeEventIds[block];
                if (eventId) {
                    await (0, googleCalendar_1.deleteAvailabilityEvent)(calendar, calendarId, eventId);
                    console.log(`Deleted calendar event for ${dateKey} ${block}`);
                }
            }
            return null;
        }
        // Process each block
        for (const block of googleCalendar_1.TIME_BLOCKS) {
            const beforeStatus = beforeBlocks === null || beforeBlocks === void 0 ? void 0 : beforeBlocks[block];
            const afterStatus = afterBlocks === null || afterBlocks === void 0 ? void 0 : afterBlocks[block];
            const eventId = updatedEventIds[block];
            // Status is now 'available' - delete event if exists
            if (!afterStatus || afterStatus === 'available') {
                if (eventId) {
                    await (0, googleCalendar_1.deleteAvailabilityEvent)(calendar, calendarId, eventId);
                    delete updatedEventIds[block];
                    hasUpdates = true;
                    console.log(`Deleted calendar event for ${dateKey} ${block}`);
                }
                continue;
            }
            // Check if this is a status we sync (not 'available')
            if (!googleCalendar_1.CALENDAR_EVENT_TITLES[afterStatus]) {
                continue;
            }
            // Status changed - update existing event
            if (eventId && beforeStatus !== afterStatus) {
                await (0, googleCalendar_1.updateBlockAvailabilityEvent)(calendar, calendarId, eventId, block, afterStatus);
                console.log(`Updated calendar event for ${dateKey} ${block} to ${afterStatus}`);
                continue;
            }
            // Create new event if we don't have one
            if (!eventId) {
                const newEventId = await (0, googleCalendar_1.createBlockAvailabilityEvent)(calendar, calendarId, dateKey, block, afterStatus, timezone);
                if (newEventId) {
                    updatedEventIds[block] = newEventId;
                    hasUpdates = true;
                    console.log(`Created calendar event ${newEventId} for ${dateKey} ${block}`);
                }
            }
        }
        // Update the document with new event IDs
        if (hasUpdates) {
            await change.after.ref.update({
                googleEventIds: updatedEventIds,
                syncSource: 'app',
            });
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
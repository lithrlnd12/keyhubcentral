"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualCalendarSync = exports.syncCalendarToApp = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const googleCalendar_1 = require("../lib/googleCalendar");
const runtimeOpts = {
    secrets: ['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET'],
    timeoutSeconds: 540, // 9 minutes
    memory: '512MB',
};
/**
 * Sync Google Calendar events to app availability
 *
 * Runs every 15 minutes. For each user with enabled calendar sync:
 * 1. Fetches events from Google Calendar for the next 30 days
 * 2. Skips events created by KeyHub (to avoid loops)
 * 3. Creates/updates availability records for busy events
 */
exports.syncCalendarToApp = functions
    .runWith(runtimeOpts)
    .pubsub.schedule('*/15 * * * *') // Every 15 minutes
    .timeZone('America/New_York')
    .onRun(async () => {
    var _a;
    const db = admin.firestore();
    // Get all users with enabled calendar sync
    const integrationsQuery = await db
        .collectionGroup('integrations')
        .where('enabled', '==', true)
        .get();
    console.log(`Found ${integrationsQuery.size} integrations to sync`);
    for (const integrationDoc of integrationsQuery.docs) {
        // Only process googleCalendar integrations
        if (integrationDoc.id !== 'googleCalendar') {
            continue;
        }
        const userId = (_a = integrationDoc.ref.parent.parent) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            continue;
        }
        try {
            await syncUserCalendar(db, userId, integrationDoc);
        }
        catch (error) {
            console.error(`Error syncing calendar for user ${userId}:`, error);
            // Update error status
            await integrationDoc.ref.update({
                lastSyncStatus: 'error',
                lastSyncError: error instanceof Error ? error.message : 'Unknown error',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }
    console.log('Calendar sync complete');
    return null;
});
/**
 * Manual sync trigger for a specific user
 */
exports.manualCalendarSync = functions
    .runWith(runtimeOpts)
    .https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in to sync calendar');
    }
    const userId = context.auth.uid;
    const db = admin.firestore();
    const integrationDoc = await db
        .collection('users')
        .doc(userId)
        .collection('integrations')
        .doc('googleCalendar')
        .get();
    if (!integrationDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'No calendar integration found');
    }
    await syncUserCalendar(db, userId, integrationDoc);
    return { success: true };
});
/**
 * Sync calendar for a specific user
 */
async function syncUserCalendar(db, userId, integrationDoc) {
    const integration = integrationDoc.data();
    if (!integration) {
        return;
    }
    // Update status to syncing
    await integrationDoc.ref.update({
        lastSyncStatus: 'syncing',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    // Get the user's contractor record
    const contractorQuery = await db
        .collection('contractors')
        .where('userId', '==', userId)
        .limit(1)
        .get();
    if (contractorQuery.empty) {
        console.log(`User ${userId} has no contractor record, skipping sync`);
        await integrationDoc.ref.update({
            lastSyncStatus: 'success',
            lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return;
    }
    const contractorId = contractorQuery.docs[0].id;
    // Get calendar client
    const calendar = await (0, googleCalendar_1.getCalendarClient)(userId);
    if (!calendar) {
        throw new Error('Failed to get calendar client');
    }
    const calendarId = integration.calendarId || 'primary';
    // Get events for the next 30 days
    const now = new Date();
    const thirtyDaysLater = new Date(now);
    thirtyDaysLater.setDate(now.getDate() + 30);
    const events = await (0, googleCalendar_1.getCalendarEvents)(calendar, calendarId, now, thirtyDaysLater);
    console.log(`Found ${events.length} events for user ${userId}`);
    // Group events by date
    const busyDates = new Map();
    for (const event of events) {
        // Skip events created by KeyHub (we already track these)
        if ((0, googleCalendar_1.isKeyHubEvent)(event)) {
            continue;
        }
        // Skip events that show as free
        if (!(0, googleCalendar_1.isEventBusy)(event)) {
            continue;
        }
        // Get the event date
        const date = (0, googleCalendar_1.getEventDate)(event);
        if (!date) {
            continue;
        }
        // Only track future dates
        if (date < formatDate(now)) {
            continue;
        }
        // Store the first busy event for each date
        if (!busyDates.has(date)) {
            busyDates.set(date, {
                eventId: event.id || '',
                summary: event.summary || 'Busy',
            });
        }
    }
    console.log(`Found ${busyDates.size} busy dates for user ${userId}`);
    // Update availability for each busy date
    const batch = db.batch();
    let batchCount = 0;
    for (const [date, eventInfo] of busyDates) {
        const availabilityRef = db
            .collection('contractors')
            .doc(contractorId)
            .collection('availability')
            .doc(date);
        // Check if we already have availability set for this date
        const existingDoc = await availabilityRef.get();
        // Skip if already set by app (don't override app-set availability)
        if (existingDoc.exists) {
            const existingData = existingDoc.data();
            if ((existingData === null || existingData === void 0 ? void 0 : existingData.syncSource) === 'app') {
                continue;
            }
        }
        batch.set(availabilityRef, {
            date,
            status: 'busy',
            notes: `From Calendar: ${eventInfo.summary}`,
            syncSource: 'google',
            googleEventId: eventInfo.eventId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        batchCount++;
        // Firestore has a limit of 500 writes per batch
        if (batchCount >= 400) {
            await batch.commit();
            batchCount = 0;
        }
    }
    // Commit remaining writes
    if (batchCount > 0) {
        await batch.commit();
    }
    // Update sync status
    await integrationDoc.ref.update({
        lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
        lastSyncStatus: 'success',
        lastSyncError: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Successfully synced calendar for user ${userId}`);
}
/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date) {
    return date.toISOString().split('T')[0];
}
//# sourceMappingURL=calendarSync.js.map
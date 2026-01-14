import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  getCalendarClient,
  createBlockAvailabilityEvent,
  updateBlockAvailabilityEvent,
  deleteAvailabilityEvent,
  CALENDAR_EVENT_TITLES,
  TIME_BLOCKS,
  TimeBlock,
} from '../lib/googleCalendar';

const runtimeOpts: functions.RuntimeOptions = {
  secrets: ['GOOGLE_CALENDAR_CLIENT_ID', 'GOOGLE_CALENDAR_CLIENT_SECRET'],
  timeoutSeconds: 60,
  memory: '256MB',
};

// Block status type matching frontend
interface BlockStatus {
  am: string;
  pm: string;
  evening: string;
}

interface BlockGoogleEventIds {
  am?: string;
  pm?: string;
  evening?: string;
}

/**
 * Sync availability changes to Google Calendar
 *
 * When a contractor sets their availability (busy, unavailable, on_leave),
 * this trigger creates/updates/deletes corresponding Google Calendar events.
 * Now handles time blocks (AM/PM/Evening) with separate events for each.
 */
export const onAvailabilityChange = functions
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
    const userId = contractorData?.userId;

    if (!userId) {
      console.log(`Contractor ${contractorId} has no userId, skipping sync`);
      return null;
    }

    // Get calendar client
    const calendar = await getCalendarClient(userId);
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
    const calendarId = integration?.calendarId || 'primary';
    const timezone = integration?.timezone || 'America/New_York';

    const before = change.before.exists ? change.before.data() : null;
    const after = change.after.exists ? change.after.data() : null;

    // Skip if this change came from Google Calendar sync (prevent loops)
    if (after?.syncSource === 'google') {
      console.log(`Skipping sync for ${dateKey} - originated from Google`);
      return null;
    }

    try {
      // Get block statuses (handle legacy format)
      const beforeBlocks: BlockStatus | null = before?.blocks || (before?.status ? {
        am: before.status,
        pm: before.status,
        evening: before.status,
      } : null);

      const afterBlocks: BlockStatus | null = after?.blocks || (after?.status ? {
        am: after.status,
        pm: after.status,
        evening: after.status,
      } : null);

      // Get existing event IDs
      const beforeEventIds: BlockGoogleEventIds = before?.googleEventIds || {};
      const afterEventIds: BlockGoogleEventIds = after?.googleEventIds || {};
      const updatedEventIds: BlockGoogleEventIds = { ...afterEventIds };
      let hasUpdates = false;

      // Document deleted - delete all calendar events
      if (!after) {
        for (const block of TIME_BLOCKS) {
          const eventId = beforeEventIds[block];
          if (eventId) {
            await deleteAvailabilityEvent(calendar, calendarId, eventId);
            console.log(`Deleted calendar event for ${dateKey} ${block}`);
          }
        }
        return null;
      }

      // Process each block
      for (const block of TIME_BLOCKS) {
        const beforeStatus = beforeBlocks?.[block];
        const afterStatus = afterBlocks?.[block];
        const eventId = updatedEventIds[block];

        // Status is now 'available' - delete event if exists
        if (!afterStatus || afterStatus === 'available') {
          if (eventId) {
            await deleteAvailabilityEvent(calendar, calendarId, eventId);
            delete updatedEventIds[block];
            hasUpdates = true;
            console.log(`Deleted calendar event for ${dateKey} ${block}`);
          }
          continue;
        }

        // Check if this is a status we sync (not 'available')
        if (!CALENDAR_EVENT_TITLES[afterStatus]) {
          continue;
        }

        // Status changed - update existing event
        if (eventId && beforeStatus !== afterStatus) {
          await updateBlockAvailabilityEvent(
            calendar,
            calendarId,
            eventId,
            block as TimeBlock,
            afterStatus
          );
          console.log(`Updated calendar event for ${dateKey} ${block} to ${afterStatus}`);
          continue;
        }

        // Create new event if we don't have one
        if (!eventId) {
          const newEventId = await createBlockAvailabilityEvent(
            calendar,
            calendarId,
            dateKey,
            block as TimeBlock,
            afterStatus,
            timezone
          );

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
    } catch (error) {
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

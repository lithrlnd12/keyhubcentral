// VAPI Voice Usage Tracking — tracks monthly minutes, cost, and call counts

import { getAdminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Track voice usage from an end-of-call-report.
 * Increments monthly counters in voiceUsage/{YYYY-MM}.
 */
export async function trackVoiceUsage(callData: {
  durationSeconds: number;
  cost: number;
  callType: 'inbound' | 'outbound';
}): Promise<void> {
  const db = getAdminDb();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const usageRef = db.collection('voiceUsage').doc(monthKey);

  const minutes = Math.ceil(callData.durationSeconds / 60);

  await usageRef.set(
    {
      totalMinutes: FieldValue.increment(minutes),
      totalSeconds: FieldValue.increment(callData.durationSeconds),
      callCount: FieldValue.increment(1),
      costTotal: FieldValue.increment(callData.cost || 0),
      [`${callData.callType}Count`]: FieldValue.increment(1),
      [`${callData.callType}Minutes`]: FieldValue.increment(minutes),
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

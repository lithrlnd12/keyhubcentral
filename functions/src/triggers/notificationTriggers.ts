import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();
const messaging = admin.messaging();

// Types for notification preferences
interface NotificationPreferences {
  pushEnabled: boolean;
  emailDigest: 'none' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
  compliance: {
    insuranceExpiring: boolean;
    licenseExpiring: boolean;
    w9Reminders: boolean;
    backgroundCheckUpdates: boolean;
  };
  jobs: {
    newAssignments: boolean;
    scheduleChanges: boolean;
    dayBeforeReminders: boolean;
    statusUpdates: boolean;
  };
  leads: {
    newLeads: boolean;
    hotLeadsOnly: boolean;
    inactivityReminders: boolean;
    leadReplacements: boolean;
  };
  financial: {
    paymentsReceived: boolean;
    commissionsEarned: boolean;
    invoiceOverdue: boolean;
    subscriptionReminders: boolean;
  };
  admin: {
    userApprovals: boolean;
    newApplicants: boolean;
    systemAlerts: boolean;
  };
}

interface FCMToken {
  token: string;
  device: 'desktop' | 'mobile';
  browser: string;
  createdAt: admin.firestore.Timestamp;
  lastUsedAt: admin.firestore.Timestamp;
}

// Check if currently in quiet hours
function isInQuietHours(quietHours: { enabled: boolean; start: string; end: string }): boolean {
  if (!quietHours.enabled) return false;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startHour, startMin] = quietHours.start.split(':').map(Number);
  const [endHour, endMin] = quietHours.end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// Send push notification to a user
async function sendPushNotification(
  userId: string,
  notification: {
    type: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    title: string;
    body: string;
    data?: Record<string, string>;
  }
): Promise<boolean> {
  try {
    // Get user document
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      console.log(`User ${userId} not found`);
      return false;
    }

    const userData = userDoc.data()!;
    const preferences = userData.notificationPreferences as NotificationPreferences;
    const tokens = (userData.fcmTokens || []) as FCMToken[];

    // Check if push is enabled
    if (!preferences?.pushEnabled) {
      console.log(`Push disabled for user ${userId}`);
      return false;
    }

    // Check quiet hours (except for urgent)
    if (notification.priority !== 'urgent' && preferences?.quietHours && isInQuietHours(preferences.quietHours)) {
      console.log(`In quiet hours for user ${userId}, skipping non-urgent notification`);
      return false;
    }

    // Get FCM tokens
    if (tokens.length === 0) {
      console.log(`No FCM tokens for user ${userId}`);
      return false;
    }

    // Log notification to Firestore
    const notificationRef = await db.collection('notifications').add({
      userId,
      type: notification.type,
      category: notification.category,
      priority: notification.priority,
      title: notification.title,
      body: notification.body,
      status: 'pending',
      channels: { push: { sent: false }, email: { sent: false } },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(notification.data?.actionUrl && { actionUrl: notification.data.actionUrl }),
      ...(notification.data?.entityType && notification.data?.entityId && {
        relatedEntity: { type: notification.data.entityType, id: notification.data.entityId },
      }),
    });

    // Send to all tokens
    const tokenStrings = tokens.map((t) => t.token);
    const message: admin.messaging.MulticastMessage = {
      tokens: tokenStrings,
      data: {
        type: notification.type,
        priority: notification.priority,
        title: notification.title,
        body: notification.body,
        notificationId: notificationRef.id,
        ...notification.data,
      },
      webpush: {
        fcmOptions: {
          link: notification.data?.actionUrl || '/overview',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);

    // Update notification status
    await notificationRef.update({
      status: 'sent',
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      'channels.push.sent': true,
      'channels.push.successCount': response.successCount,
      'channels.push.failureCount': response.failureCount,
    });

    console.log(`Sent notification to user ${userId}: ${response.successCount} success, ${response.failureCount} failed`);

    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success && resp.error?.code === 'messaging/registration-token-not-registered') {
          invalidTokens.push(tokenStrings[idx]);
        }
      });

      if (invalidTokens.length > 0) {
        const validTokens = tokens.filter((t) => !invalidTokens.includes(t.token));
        await userDoc.ref.update({ fcmTokens: validTokens });
        console.log(`Removed ${invalidTokens.length} invalid tokens for user ${userId}`);
      }
    }

    return response.successCount > 0;
  } catch (error) {
    console.error(`Error sending notification to user ${userId}:`, error);
    return false;
  }
}

// Send notification to all admins
async function notifyAdmins(
  notification: {
    type: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    title: string;
    body: string;
    data?: Record<string, string>;
  },
  checkPreference?: (prefs: NotificationPreferences) => boolean
): Promise<void> {
  try {
    const adminsSnapshot = await db
      .collection('users')
      .where('role', 'in', ['owner', 'admin'])
      .where('status', '==', 'active')
      .get();

    const promises = adminsSnapshot.docs.map(async (doc) => {
      const prefs = doc.data().notificationPreferences as NotificationPreferences;
      if (checkPreference && prefs && !checkPreference(prefs)) {
        return;
      }
      await sendPushNotification(doc.id, notification);
    });

    await Promise.all(promises);
  } catch (error) {
    console.error('Error notifying admins:', error);
  }
}

// ==================== SCHEDULED FUNCTIONS ====================

// Daily check for expiring insurance, licenses, etc.
export const dailyExpirationCheck = functions.pubsub
  .schedule('0 8 * * *') // 8 AM daily
  .timeZone('America/New_York')
  .onRun(async () => {
    console.log('Running daily expiration check...');

    const now = new Date();

    // Check contractors for expiring insurance
    const contractorsSnapshot = await db
      .collection('contractors')
      .where('status', '==', 'active')
      .get();

    for (const doc of contractorsSnapshot.docs) {
      const contractor = doc.data();
      const userId = contractor.userId;

      if (!userId) continue;

      // Check insurance expiration
      const insuranceExpires = contractor.insurance?.expiration?.toDate?.();
      if (insuranceExpires) {
        const daysUntilExpiry = Math.ceil(
          (insuranceExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry === 30) {
          await sendPushNotification(userId, {
            type: 'insurance_expiring_30',
            category: 'compliance',
            priority: 'medium',
            title: 'Insurance Expires in 30 Days',
            body: `Your insurance policy expires on ${insuranceExpires.toLocaleDateString()}. Upload a new certificate to stay compliant.`,
            data: {
              actionUrl: '/portal/documents',
              entityType: 'contractor',
              entityId: doc.id,
              expirationDate: insuranceExpires.toLocaleDateString(),
            },
          });

          // Also notify admins
          await notifyAdmins(
            {
              type: 'insurance_expiring_30',
              category: 'compliance',
              priority: 'medium',
              title: `Insurance Expiring: ${contractor.businessName || contractor.displayName}`,
              body: `Contractor's insurance expires on ${insuranceExpires.toLocaleDateString()}.`,
              data: {
                actionUrl: `/kts/${doc.id}`,
                entityType: 'contractor',
                entityId: doc.id,
              },
            },
            (prefs) => prefs.compliance?.insuranceExpiring ?? false
          );
        }

        if (daysUntilExpiry === 7) {
          await sendPushNotification(userId, {
            type: 'insurance_expiring_7',
            category: 'compliance',
            priority: 'high',
            title: 'Insurance Expires in 7 Days',
            body: `Your insurance expires ${insuranceExpires.toLocaleDateString()}. Upload new certificate now to avoid work interruption.`,
            data: {
              actionUrl: '/portal/documents',
              entityType: 'contractor',
              entityId: doc.id,
              expirationDate: insuranceExpires.toLocaleDateString(),
            },
          });

          await notifyAdmins(
            {
              type: 'insurance_expiring_7',
              category: 'compliance',
              priority: 'high',
              title: `URGENT: Insurance Expiring Soon`,
              body: `${contractor.businessName || contractor.displayName}'s insurance expires in 7 days.`,
              data: {
                actionUrl: `/kts/${doc.id}`,
                entityType: 'contractor',
                entityId: doc.id,
              },
            },
            (prefs) => prefs.compliance?.insuranceExpiring ?? false
          );
        }

        if (daysUntilExpiry <= 0) {
          await sendPushNotification(userId, {
            type: 'insurance_expired',
            category: 'compliance',
            priority: 'urgent',
            title: 'Insurance Expired - Action Required',
            body: 'Your insurance has expired. You cannot be assigned jobs until updated.',
            data: {
              actionUrl: '/portal/documents',
              entityType: 'contractor',
              entityId: doc.id,
            },
          });

          // Update contractor compliance status
          await doc.ref.update({
            'compliance.insurance.status': 'expired',
            'compliance.fullyCompliant': false,
          });

          await notifyAdmins(
            {
              type: 'insurance_expired',
              category: 'compliance',
              priority: 'urgent',
              title: `Insurance EXPIRED`,
              body: `${contractor.businessName || contractor.displayName}'s insurance has expired.`,
              data: {
                actionUrl: `/kts/${doc.id}`,
                entityType: 'contractor',
                entityId: doc.id,
              },
            },
            (prefs) => prefs.compliance?.insuranceExpiring ?? false
          );
        }
      }

      // Check license expiration
      const licenses = contractor.licenses || [];
      for (const license of licenses) {
        const licenseExpires = license.expiration?.toDate?.();
        if (licenseExpires) {
          const daysUntilExpiry = Math.ceil(
            (licenseExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry === 30) {
            await sendPushNotification(userId, {
              type: 'license_expiring',
              category: 'compliance',
              priority: 'medium',
              title: 'License Expiring Soon',
              body: `Your ${license.type} license expires on ${licenseExpires.toLocaleDateString()}. Update your documents.`,
              data: {
                actionUrl: '/portal/documents',
                licenseType: license.type,
                expirationDate: licenseExpires.toLocaleDateString(),
              },
            });
          }
        }
      }
    }

    // Check for jobs starting tomorrow
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const jobsSnapshot = await db
      .collection('jobs')
      .where('dates.scheduledStart', '>=', admin.firestore.Timestamp.fromDate(tomorrow))
      .where('dates.scheduledStart', '<', admin.firestore.Timestamp.fromDate(dayAfterTomorrow))
      .where('status', 'in', ['scheduled', 'production'])
      .get();

    for (const doc of jobsSnapshot.docs) {
      const job = doc.data();

      // Notify assigned crew
      const crewIds = job.crewIds || [];
      for (const crewId of crewIds) {
        // Get contractor's userId
        const contractorDoc = await db.collection('contractors').doc(crewId).get();
        if (contractorDoc.exists) {
          const userId = contractorDoc.data()?.userId;
          if (userId) {
            await sendPushNotification(userId, {
              type: 'job_starting_tomorrow',
              category: 'jobs',
              priority: 'medium',
              title: 'Job Starting Tomorrow',
              body: `Reminder: ${job.type} at ${job.customer?.address?.street || 'location'} starts tomorrow.`,
              data: {
                actionUrl: `/kr/${doc.id}`,
                jobId: doc.id,
                jobType: job.type,
                address: job.customer?.address?.street || '',
              },
            });
          }
        }
      }

      // Notify PM
      if (job.pmId) {
        const pmDoc = await db.collection('contractors').doc(job.pmId).get();
        if (pmDoc.exists) {
          const userId = pmDoc.data()?.userId;
          if (userId) {
            await sendPushNotification(userId, {
              type: 'job_starting_tomorrow',
              category: 'jobs',
              priority: 'medium',
              title: 'Job Starting Tomorrow',
              body: `Job ${job.jobNumber}: ${job.type} at ${job.customer?.address?.street || 'location'} starts tomorrow.`,
              data: {
                actionUrl: `/kr/${doc.id}`,
                jobId: doc.id,
                jobNumber: job.jobNumber,
              },
            });
          }
        }
      }
    }

    console.log('Daily expiration check completed');
    return null;
  });

// ==================== FIRESTORE TRIGGERS ====================

// When a lead is assigned
export const onLeadAssigned = functions.firestore
  .document('leads/{leadId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const leadId = context.params.leadId;

    // Check if assignedTo changed
    if (beforeData.assignedTo === afterData.assignedTo) {
      return null;
    }

    const newAssignee = afterData.assignedTo;
    if (!newAssignee) return null;

    const quality = afterData.quality || 'warm';
    const isHot = quality === 'hot';

    await sendPushNotification(newAssignee, {
      type: isHot ? 'lead_hot' : 'lead_assigned',
      category: 'leads',
      priority: isHot ? 'urgent' : 'high',
      title: isHot ? `Hot Lead: ${afterData.customer?.name}` : `New Lead: ${afterData.customer?.name}`,
      body: `${afterData.trade} lead in ${afterData.customer?.address?.city || 'your area'}. ${isHot ? 'Call now!' : 'Contact within 1 hour.'}`,
      data: {
        actionUrl: `/kd/leads/${leadId}`,
        leadId,
        customerName: afterData.customer?.name || '',
        tradeType: afterData.trade || '',
        city: afterData.customer?.address?.city || '',
        quality,
      },
    });

    return null;
  });

// When a job is assigned to a crew member
export const onJobAssigned = functions.firestore
  .document('jobs/{jobId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const jobId = context.params.jobId;

    // Check for new crew assignments
    const beforeCrew = new Set(beforeData.crewIds || []);
    const afterCrew = afterData.crewIds || [];

    const newAssignees = afterCrew.filter((id: string) => !beforeCrew.has(id));

    for (const contractorId of newAssignees) {
      const contractorDoc = await db.collection('contractors').doc(contractorId).get();
      if (contractorDoc.exists) {
        const userId = contractorDoc.data()?.userId;
        if (userId) {
          const scheduledDate = afterData.dates?.scheduledStart?.toDate?.();
          await sendPushNotification(userId, {
            type: 'job_assigned',
            category: 'jobs',
            priority: 'high',
            title: 'New Job Assignment',
            body: `You've been assigned to ${afterData.type} at ${afterData.customer?.address?.street || 'location'}${scheduledDate ? `. Scheduled for ${scheduledDate.toLocaleDateString()}` : ''}.`,
            data: {
              actionUrl: `/kr/${jobId}`,
              jobId,
              jobType: afterData.type || '',
              address: afterData.customer?.address?.street || '',
              date: scheduledDate?.toLocaleDateString() || '',
            },
          });
        }
      }
    }

    // Check for schedule change
    const beforeStart = beforeData.dates?.scheduledStart?.toDate?.()?.getTime();
    const afterStart = afterData.dates?.scheduledStart?.toDate?.()?.getTime();

    if (beforeStart && afterStart && beforeStart !== afterStart) {
      const allCrew = afterData.crewIds || [];
      for (const contractorId of allCrew) {
        const contractorDoc = await db.collection('contractors').doc(contractorId).get();
        if (contractorDoc.exists) {
          const userId = contractorDoc.data()?.userId;
          if (userId) {
            const newDate = afterData.dates.scheduledStart.toDate();
            await sendPushNotification(userId, {
              type: 'job_schedule_changed',
              category: 'jobs',
              priority: 'high',
              title: 'Job Schedule Changed',
              body: `${afterData.type} at ${afterData.customer?.address?.street || 'location'} has been rescheduled to ${newDate.toLocaleDateString()}.`,
              data: {
                actionUrl: `/kr/${jobId}`,
                jobId,
                newDate: newDate.toLocaleDateString(),
              },
            });
          }
        }
      }
    }

    return null;
  });

// When a user is pending approval
export const onUserPendingApproval = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    const userData = snapshot.data();

    if (userData.status !== 'pending') return null;

    await notifyAdmins(
      {
        type: 'user_pending_approval',
        category: 'admin',
        priority: 'high',
        title: 'New User Awaiting Approval',
        body: `${userData.displayName} (${userData.email}) signed up and needs approval.`,
        data: {
          actionUrl: '/admin',
          userName: userData.displayName || '',
          email: userData.email || '',
          requestedRole: userData.role || 'pending',
        },
      },
      (prefs) => prefs.admin?.userApprovals ?? false
    );

    return null;
  });

// When an invoice becomes overdue
export const onInvoiceOverdue = functions.firestore
  .document('invoices/{invoiceId}')
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const invoiceId = context.params.invoiceId;

    // Check if status changed to overdue
    if (beforeData.status !== 'overdue' && afterData.status === 'overdue') {
      await notifyAdmins(
        {
          type: 'invoice_overdue',
          category: 'financial',
          priority: 'high',
          title: 'Invoice Overdue',
          body: `Invoice ${afterData.invoiceNumber} for $${afterData.total?.toFixed(2)} is now overdue.`,
          data: {
            actionUrl: `/financials/invoices/${invoiceId}`,
            invoiceId,
            invoiceNumber: afterData.invoiceNumber || '',
            amount: afterData.total?.toFixed(2) || '0',
          },
        },
        (prefs) => prefs.financial?.invoiceOverdue ?? false
      );
    }

    return null;
  });

// Export a callable function for testing
export const testNotification = functions.https.onCall(async (data, context) => {
  // Only allow admins
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
  }

  const { userId, type, title, body } = data;

  if (!userId || !type || !title || !body) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields');
  }

  const success = await sendPushNotification(userId, {
    type,
    category: 'admin',
    priority: 'medium',
    title,
    body,
    data: { actionUrl: '/overview' },
  });

  return { success };
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testNotification = exports.onInvoiceOverdue = exports.onUserPendingApproval = exports.onJobAssigned = exports.onLeadAssigned = exports.dailyExpirationCheck = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const db = admin.firestore();
const messaging = admin.messaging();
// Check if currently in quiet hours
function isInQuietHours(quietHours) {
    if (!quietHours.enabled)
        return false;
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
async function sendPushNotification(userId, notification) {
    var _a, _b, _c, _d;
    try {
        // Get user document
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.log(`User ${userId} not found`);
            return false;
        }
        const userData = userDoc.data();
        const preferences = userData.notificationPreferences;
        const tokens = (userData.fcmTokens || []);
        // Check if push is enabled
        if (!(preferences === null || preferences === void 0 ? void 0 : preferences.pushEnabled)) {
            console.log(`Push disabled for user ${userId}`);
            return false;
        }
        // Check quiet hours (except for urgent)
        if (notification.priority !== 'urgent' && (preferences === null || preferences === void 0 ? void 0 : preferences.quietHours) && isInQuietHours(preferences.quietHours)) {
            console.log(`In quiet hours for user ${userId}, skipping non-urgent notification`);
            return false;
        }
        // Get FCM tokens
        if (tokens.length === 0) {
            console.log(`No FCM tokens for user ${userId}`);
            return false;
        }
        // Log notification to Firestore
        const notificationRef = await db.collection('notifications').add(Object.assign(Object.assign({ userId, type: notification.type, category: notification.category, priority: notification.priority, title: notification.title, body: notification.body, status: 'pending', channels: { push: { sent: false }, email: { sent: false } }, createdAt: admin.firestore.FieldValue.serverTimestamp() }, (((_a = notification.data) === null || _a === void 0 ? void 0 : _a.actionUrl) && { actionUrl: notification.data.actionUrl })), (((_b = notification.data) === null || _b === void 0 ? void 0 : _b.entityType) && ((_c = notification.data) === null || _c === void 0 ? void 0 : _c.entityId) && {
            relatedEntity: { type: notification.data.entityType, id: notification.data.entityId },
        })));
        // Send to all tokens
        const tokenStrings = tokens.map((t) => t.token);
        const message = {
            tokens: tokenStrings,
            data: Object.assign({ type: notification.type, priority: notification.priority, title: notification.title, body: notification.body, notificationId: notificationRef.id }, notification.data),
            webpush: {
                fcmOptions: {
                    link: ((_d = notification.data) === null || _d === void 0 ? void 0 : _d.actionUrl) || '/overview',
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
            const invalidTokens = [];
            response.responses.forEach((resp, idx) => {
                var _a;
                if (!resp.success && ((_a = resp.error) === null || _a === void 0 ? void 0 : _a.code) === 'messaging/registration-token-not-registered') {
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
    }
    catch (error) {
        console.error(`Error sending notification to user ${userId}:`, error);
        return false;
    }
}
// Send notification to all admins
async function notifyAdmins(notification, checkPreference) {
    try {
        const adminsSnapshot = await db
            .collection('users')
            .where('role', 'in', ['owner', 'admin'])
            .where('status', '==', 'active')
            .get();
        const promises = adminsSnapshot.docs.map(async (doc) => {
            const prefs = doc.data().notificationPreferences;
            if (checkPreference && prefs && !checkPreference(prefs)) {
                return;
            }
            await sendPushNotification(doc.id, notification);
        });
        await Promise.all(promises);
    }
    catch (error) {
        console.error('Error notifying admins:', error);
    }
}
// ==================== SCHEDULED FUNCTIONS ====================
// Daily check for expiring insurance, licenses, etc.
exports.dailyExpirationCheck = functions.pubsub
    .schedule('0 8 * * *') // 8 AM daily
    .timeZone('America/New_York')
    .onRun(async () => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
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
        if (!userId)
            continue;
        // Check insurance expiration
        const insuranceExpires = (_c = (_b = (_a = contractor.insurance) === null || _a === void 0 ? void 0 : _a.expiration) === null || _b === void 0 ? void 0 : _b.toDate) === null || _c === void 0 ? void 0 : _c.call(_b);
        if (insuranceExpires) {
            const daysUntilExpiry = Math.ceil((insuranceExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
                await notifyAdmins({
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
                }, (prefs) => { var _a, _b; return (_b = (_a = prefs.compliance) === null || _a === void 0 ? void 0 : _a.insuranceExpiring) !== null && _b !== void 0 ? _b : false; });
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
                await notifyAdmins({
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
                }, (prefs) => { var _a, _b; return (_b = (_a = prefs.compliance) === null || _a === void 0 ? void 0 : _a.insuranceExpiring) !== null && _b !== void 0 ? _b : false; });
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
                await notifyAdmins({
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
                }, (prefs) => { var _a, _b; return (_b = (_a = prefs.compliance) === null || _a === void 0 ? void 0 : _a.insuranceExpiring) !== null && _b !== void 0 ? _b : false; });
            }
        }
        // Check license expiration
        const licenses = contractor.licenses || [];
        for (const license of licenses) {
            const licenseExpires = (_e = (_d = license.expiration) === null || _d === void 0 ? void 0 : _d.toDate) === null || _e === void 0 ? void 0 : _e.call(_d);
            if (licenseExpires) {
                const daysUntilExpiry = Math.ceil((licenseExpires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
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
                const userId = (_f = contractorDoc.data()) === null || _f === void 0 ? void 0 : _f.userId;
                if (userId) {
                    await sendPushNotification(userId, {
                        type: 'job_starting_tomorrow',
                        category: 'jobs',
                        priority: 'medium',
                        title: 'Job Starting Tomorrow',
                        body: `Reminder: ${job.type} at ${((_h = (_g = job.customer) === null || _g === void 0 ? void 0 : _g.address) === null || _h === void 0 ? void 0 : _h.street) || 'location'} starts tomorrow.`,
                        data: {
                            actionUrl: `/kr/${doc.id}`,
                            jobId: doc.id,
                            jobType: job.type,
                            address: ((_k = (_j = job.customer) === null || _j === void 0 ? void 0 : _j.address) === null || _k === void 0 ? void 0 : _k.street) || '',
                        },
                    });
                }
            }
        }
        // Notify PM
        if (job.pmId) {
            const pmDoc = await db.collection('contractors').doc(job.pmId).get();
            if (pmDoc.exists) {
                const userId = (_l = pmDoc.data()) === null || _l === void 0 ? void 0 : _l.userId;
                if (userId) {
                    await sendPushNotification(userId, {
                        type: 'job_starting_tomorrow',
                        category: 'jobs',
                        priority: 'medium',
                        title: 'Job Starting Tomorrow',
                        body: `Job ${job.jobNumber}: ${job.type} at ${((_o = (_m = job.customer) === null || _m === void 0 ? void 0 : _m.address) === null || _o === void 0 ? void 0 : _o.street) || 'location'} starts tomorrow.`,
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
exports.onLeadAssigned = functions.firestore
    .document('leads/{leadId}')
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d, _e, _f, _g;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const leadId = context.params.leadId;
    // Check if assignedTo changed
    if (beforeData.assignedTo === afterData.assignedTo) {
        return null;
    }
    const newAssignee = afterData.assignedTo;
    if (!newAssignee)
        return null;
    const quality = afterData.quality || 'warm';
    const isHot = quality === 'hot';
    await sendPushNotification(newAssignee, {
        type: isHot ? 'lead_hot' : 'lead_assigned',
        category: 'leads',
        priority: isHot ? 'urgent' : 'high',
        title: isHot ? `Hot Lead: ${(_a = afterData.customer) === null || _a === void 0 ? void 0 : _a.name}` : `New Lead: ${(_b = afterData.customer) === null || _b === void 0 ? void 0 : _b.name}`,
        body: `${afterData.trade} lead in ${((_d = (_c = afterData.customer) === null || _c === void 0 ? void 0 : _c.address) === null || _d === void 0 ? void 0 : _d.city) || 'your area'}. ${isHot ? 'Call now!' : 'Contact within 1 hour.'}`,
        data: {
            actionUrl: `/kd/leads/${leadId}`,
            leadId,
            customerName: ((_e = afterData.customer) === null || _e === void 0 ? void 0 : _e.name) || '',
            tradeType: afterData.trade || '',
            city: ((_g = (_f = afterData.customer) === null || _f === void 0 ? void 0 : _f.address) === null || _g === void 0 ? void 0 : _g.city) || '',
            quality,
        },
    });
    return null;
});
// When a job is assigned to a crew member
exports.onJobAssigned = functions.firestore
    .document('jobs/{jobId}')
    .onUpdate(async (change, context) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const jobId = context.params.jobId;
    // Check for new crew assignments
    const beforeCrew = new Set(beforeData.crewIds || []);
    const afterCrew = afterData.crewIds || [];
    const newAssignees = afterCrew.filter((id) => !beforeCrew.has(id));
    for (const contractorId of newAssignees) {
        const contractorDoc = await db.collection('contractors').doc(contractorId).get();
        if (contractorDoc.exists) {
            const userId = (_a = contractorDoc.data()) === null || _a === void 0 ? void 0 : _a.userId;
            if (userId) {
                const scheduledDate = (_d = (_c = (_b = afterData.dates) === null || _b === void 0 ? void 0 : _b.scheduledStart) === null || _c === void 0 ? void 0 : _c.toDate) === null || _d === void 0 ? void 0 : _d.call(_c);
                await sendPushNotification(userId, {
                    type: 'job_assigned',
                    category: 'jobs',
                    priority: 'high',
                    title: 'New Job Assignment',
                    body: `You've been assigned to ${afterData.type} at ${((_f = (_e = afterData.customer) === null || _e === void 0 ? void 0 : _e.address) === null || _f === void 0 ? void 0 : _f.street) || 'location'}${scheduledDate ? `. Scheduled for ${scheduledDate.toLocaleDateString()}` : ''}.`,
                    data: {
                        actionUrl: `/kr/${jobId}`,
                        jobId,
                        jobType: afterData.type || '',
                        address: ((_h = (_g = afterData.customer) === null || _g === void 0 ? void 0 : _g.address) === null || _h === void 0 ? void 0 : _h.street) || '',
                        date: (scheduledDate === null || scheduledDate === void 0 ? void 0 : scheduledDate.toLocaleDateString()) || '',
                    },
                });
            }
        }
    }
    // Check for schedule change
    const beforeStart = (_m = (_l = (_k = (_j = beforeData.dates) === null || _j === void 0 ? void 0 : _j.scheduledStart) === null || _k === void 0 ? void 0 : _k.toDate) === null || _l === void 0 ? void 0 : _l.call(_k)) === null || _m === void 0 ? void 0 : _m.getTime();
    const afterStart = (_r = (_q = (_p = (_o = afterData.dates) === null || _o === void 0 ? void 0 : _o.scheduledStart) === null || _p === void 0 ? void 0 : _p.toDate) === null || _q === void 0 ? void 0 : _q.call(_p)) === null || _r === void 0 ? void 0 : _r.getTime();
    if (beforeStart && afterStart && beforeStart !== afterStart) {
        const allCrew = afterData.crewIds || [];
        for (const contractorId of allCrew) {
            const contractorDoc = await db.collection('contractors').doc(contractorId).get();
            if (contractorDoc.exists) {
                const userId = (_s = contractorDoc.data()) === null || _s === void 0 ? void 0 : _s.userId;
                if (userId) {
                    const newDate = afterData.dates.scheduledStart.toDate();
                    await sendPushNotification(userId, {
                        type: 'job_schedule_changed',
                        category: 'jobs',
                        priority: 'high',
                        title: 'Job Schedule Changed',
                        body: `${afterData.type} at ${((_u = (_t = afterData.customer) === null || _t === void 0 ? void 0 : _t.address) === null || _u === void 0 ? void 0 : _u.street) || 'location'} has been rescheduled to ${newDate.toLocaleDateString()}.`,
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
exports.onUserPendingApproval = functions.firestore
    .document('users/{userId}')
    .onCreate(async (snapshot, context) => {
    const userData = snapshot.data();
    if (userData.status !== 'pending')
        return null;
    await notifyAdmins({
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
    }, (prefs) => { var _a, _b; return (_b = (_a = prefs.admin) === null || _a === void 0 ? void 0 : _a.userApprovals) !== null && _b !== void 0 ? _b : false; });
    return null;
});
// When an invoice becomes overdue
exports.onInvoiceOverdue = functions.firestore
    .document('invoices/{invoiceId}')
    .onUpdate(async (change, context) => {
    var _a, _b;
    const beforeData = change.before.data();
    const afterData = change.after.data();
    const invoiceId = context.params.invoiceId;
    // Check if status changed to overdue
    if (beforeData.status !== 'overdue' && afterData.status === 'overdue') {
        await notifyAdmins({
            type: 'invoice_overdue',
            category: 'financial',
            priority: 'high',
            title: 'Invoice Overdue',
            body: `Invoice ${afterData.invoiceNumber} for $${(_a = afterData.total) === null || _a === void 0 ? void 0 : _a.toFixed(2)} is now overdue.`,
            data: {
                actionUrl: `/financials/invoices/${invoiceId}`,
                invoiceId,
                invoiceNumber: afterData.invoiceNumber || '',
                amount: ((_b = afterData.total) === null || _b === void 0 ? void 0 : _b.toFixed(2)) || '0',
            },
        }, (prefs) => { var _a, _b; return (_b = (_a = prefs.financial) === null || _a === void 0 ? void 0 : _a.invoiceOverdue) !== null && _b !== void 0 ? _b : false; });
    }
    return null;
});
// Export a callable function for testing
exports.testNotification = functions.https.onCall(async (data, context) => {
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
//# sourceMappingURL=notificationTriggers.js.map
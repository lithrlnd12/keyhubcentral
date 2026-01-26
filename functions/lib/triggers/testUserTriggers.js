"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTestUsers = exports.seedTestUsers = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const TEST_PASSWORD = 'TestPassword123!';
// Test users to be created for Playwright E2E tests
const TEST_USERS = [
    {
        email: 'owner@keyhub.test',
        displayName: 'Test Owner',
        role: 'owner',
    },
    {
        email: 'admin@keyhub.test',
        displayName: 'Test Admin',
        role: 'admin',
    },
    {
        email: 'salesrep@keyhub.test',
        displayName: 'Test Sales Rep',
        role: 'sales_rep',
    },
    {
        email: 'contractor@keyhub.test',
        displayName: 'Test Contractor',
        role: 'contractor',
    },
    {
        email: 'pm@keyhub.test',
        displayName: 'Test PM',
        role: 'pm',
    },
    {
        email: 'subscriber@keyhub.test',
        displayName: 'Test Subscriber',
        role: 'subscriber',
    },
    {
        email: 'partner@keyhub.test',
        displayName: 'Test Partner',
        role: 'partner',
    },
    {
        email: 'pending@keyhub.test',
        displayName: 'Test Pending',
        role: 'pending',
    },
];
/**
 * Creates test users for Playwright E2E testing.
 * Only callable by authenticated admin/owner users.
 */
exports.seedTestUsers = functions.https.onCall(async (data, context) => {
    var _a;
    // Verify caller is authenticated and is admin/owner
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    // Get caller's role from Firestore
    const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const callerRole = (_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (!['owner', 'admin'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Must be admin or owner');
    }
    const results = [];
    for (const testUser of TEST_USERS) {
        try {
            // Check if user already exists
            let userRecord;
            try {
                userRecord = await admin.auth().getUserByEmail(testUser.email);
                console.log(`User ${testUser.email} already exists`);
            }
            catch (error) {
                if (error.code === 'auth/user-not-found') {
                    // Create the user
                    userRecord = await admin.auth().createUser({
                        email: testUser.email,
                        password: TEST_PASSWORD,
                        displayName: testUser.displayName,
                        emailVerified: true,
                    });
                    console.log(`Created user ${testUser.email}`);
                }
                else {
                    throw error;
                }
            }
            // Create/update Firestore profile
            await admin.firestore().collection('users').doc(userRecord.uid).set({
                uid: userRecord.uid,
                email: testUser.email,
                displayName: testUser.displayName,
                phone: null,
                role: testUser.role,
                status: testUser.role === 'pending' ? 'pending' : 'active',
                requestedRole: null,
                baseZipCode: null,
                baseCoordinates: null,
                partnerId: testUser.role === 'partner' ? 'partner-test-001' : null,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                approvedAt: testUser.role !== 'pending' ? admin.firestore.FieldValue.serverTimestamp() : null,
                approvedBy: testUser.role !== 'pending' ? 'system-seed' : null,
            }, { merge: true });
            results.push({ email: testUser.email, success: true });
        }
        catch (error) {
            console.error(`Error creating ${testUser.email}:`, error);
            results.push({ email: testUser.email, success: false, error: error.message });
        }
    }
    // Also create a test partner company for the partner user
    try {
        await admin.firestore().collection('partners').doc('partner-test-001').set({
            name: 'Test Partner Company',
            email: 'partner@keyhub.test',
            phone: '555-555-5555',
            address: {
                street: '123 Test Street',
                city: 'Dallas',
                state: 'TX',
                zip: '75201',
            },
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
    }
    catch (error) {
        console.error('Error creating test partner:', error);
    }
    return {
        success: true,
        message: `Created ${results.filter(r => r.success).length} of ${TEST_USERS.length} test users`,
        results,
    };
});
/**
 * Deletes all test users (emails ending in @keyhub.test)
 * Only callable by authenticated admin/owner users.
 */
exports.deleteTestUsers = functions.https.onCall(async (data, context) => {
    var _a;
    // Verify caller is authenticated and is admin/owner
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');
    }
    // Get caller's role from Firestore
    const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const callerRole = (_a = callerDoc.data()) === null || _a === void 0 ? void 0 : _a.role;
    if (!['owner', 'admin'].includes(callerRole)) {
        throw new functions.https.HttpsError('permission-denied', 'Must be admin or owner');
    }
    const results = [];
    for (const testUser of TEST_USERS) {
        try {
            // Get user by email
            const userRecord = await admin.auth().getUserByEmail(testUser.email);
            // Delete from Auth
            await admin.auth().deleteUser(userRecord.uid);
            // Delete from Firestore
            await admin.firestore().collection('users').doc(userRecord.uid).delete();
            results.push({ email: testUser.email, success: true });
        }
        catch (error) {
            if (error.code === 'auth/user-not-found') {
                results.push({ email: testUser.email, success: true });
            }
            else {
                console.error(`Error deleting ${testUser.email}:`, error);
                results.push({ email: testUser.email, success: false, error: error.message });
            }
        }
    }
    // Delete test partner
    try {
        await admin.firestore().collection('partners').doc('partner-test-001').delete();
    }
    catch (error) {
        console.error('Error deleting test partner:', error);
    }
    return {
        success: true,
        message: `Deleted ${results.filter(r => r.success).length} test users`,
        results,
    };
});
//# sourceMappingURL=testUserTriggers.js.map
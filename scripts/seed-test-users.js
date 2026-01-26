const admin = require('firebase-admin');

// Initialize with application default credentials (uses gcloud auth)
admin.initializeApp({
  projectId: 'key-hub-central',
});

const TEST_PASSWORD = 'TestPassword123!';

const TEST_USERS = [
  { email: 'owner@keyhub.test', displayName: 'Test Owner', role: 'owner' },
  { email: 'admin@keyhub.test', displayName: 'Test Admin', role: 'admin' },
  { email: 'salesrep@keyhub.test', displayName: 'Test Sales Rep', role: 'sales_rep' },
  { email: 'contractor@keyhub.test', displayName: 'Test Contractor', role: 'contractor' },
  { email: 'pm@keyhub.test', displayName: 'Test PM', role: 'pm' },
  { email: 'subscriber@keyhub.test', displayName: 'Test Subscriber', role: 'subscriber' },
  { email: 'partner@keyhub.test', displayName: 'Test Partner', role: 'partner' },
  { email: 'pending@keyhub.test', displayName: 'Test Pending', role: 'pending' },
];

async function seedTestUsers() {
  console.log('Creating test users...\n');

  for (const testUser of TEST_USERS) {
    try {
      let userRecord;

      // Check if user exists
      try {
        userRecord = await admin.auth().getUserByEmail(testUser.email);
        console.log(`✓ ${testUser.email} already exists (uid: ${userRecord.uid})`);
      } catch (error) {
        if (error.code === 'auth/user-not-found') {
          // Create the user
          userRecord = await admin.auth().createUser({
            email: testUser.email,
            password: TEST_PASSWORD,
            displayName: testUser.displayName,
            emailVerified: true,
          });
          console.log(`✓ Created ${testUser.email} (uid: ${userRecord.uid})`);
        } else {
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

    } catch (error) {
      console.error(`✗ Error with ${testUser.email}:`, error.message);
    }
  }

  // Create test partner company
  try {
    await admin.firestore().collection('partners').doc('partner-test-001').set({
      name: 'Test Partner Company',
      email: 'partner@keyhub.test',
      phone: '555-555-5555',
      address: { street: '123 Test Street', city: 'Dallas', state: 'TX', zip: '75201' },
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('\n✓ Created test partner company');
  } catch (error) {
    console.error('✗ Error creating test partner:', error.message);
  }

  console.log('\n✅ Done! Test users created with password: TestPassword123!');
  process.exit(0);
}

seedTestUsers().catch(console.error);

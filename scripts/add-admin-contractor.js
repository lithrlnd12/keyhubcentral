const admin = require('firebase-admin');

// Initialize with default credentials (uses gcloud auth)
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'key-hub-central'
  });
}

const db = admin.firestore();

async function findAndCreateContractor() {
  // Find user by email
  const usersSnapshot = await db.collection('users')
    .where('email', '==', 'aaron@innovativeaiconsulting.com')
    .limit(1)
    .get();

  if (usersSnapshot.empty) {
    console.log('User not found');
    return;
  }

  const userDoc = usersSnapshot.docs[0];
  const userId = userDoc.id;
  const userData = userDoc.data();

  console.log('Found user:', userId, userData.displayName);

  // Check if contractor already exists
  const existingContractor = await db.collection('contractors')
    .where('userId', '==', userId)
    .limit(1)
    .get();

  if (!existingContractor.empty) {
    console.log('Contractor already exists:', existingContractor.docs[0].id);
    return;
  }

  // Create contractor record
  const contractorRef = await db.collection('contractors').add({
    userId: userId,
    businessName: userData.displayName || 'Admin Test',
    email: userData.email,
    phone: userData.phone || null,
    status: 'active',
    trades: ['admin-testing'],
    skills: [],
    rating: 'elite',
    commissionRate: 0.10,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  console.log('Created contractor:', contractorRef.id);
}

findAndCreateContractor()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });

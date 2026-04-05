/**
 * Clear all Firestore data EXCEPT users collection
 *
 * Usage: node scripts/clear-data.js
 *
 * Make sure you have GOOGLE_APPLICATION_CREDENTIALS set or
 * run this from a machine with Firebase admin access.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Collections to delete (everything except 'users')
const COLLECTIONS_TO_DELETE = [
  'contractors',
  'jobs',
  'leads',
  'invoices',
  'contracts',
  'receipts',
  'expenses',
  'inventoryItems',
  'inventoryLocations',
  'inventoryStock',
  'inventoryCounts',
  'partners',
  'laborRequests',
  'partnerServiceTickets',
  'serviceTickets',
  'campaigns',
  'subscriptions',
  'notifications',
  'ratingRequests',
  'payouts',
  'smsConversations',
  'voiceCalls',
  'inboundCalls',
  // Additional collections found in Firestore
  'conversations',
  'pendingTransfers',
  'remoteSigningSessions',
  'voiceUsage',
  'webhookLogs',
];

// Subcollections to delete (parent -> subcollection name)
const SUBCOLLECTIONS = {
  'contractors': ['availability'],
  'jobs': ['communications'],
  'users': ['integrations'], // Keep user docs but clear their integrations if needed
};

async function deleteCollection(collectionPath, batchSize = 100) {
  const collectionRef = db.collection(collectionPath);
  const query = collectionRef.limit(batchSize);

  let deleted = 0;

  while (true) {
    const snapshot = await query.get();

    if (snapshot.empty) {
      break;
    }

    const batch = db.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deleted += snapshot.size;
    console.log(`  Deleted ${deleted} documents from ${collectionPath}`);

    if (snapshot.size < batchSize) {
      break;
    }
  }

  return deleted;
}

async function deleteSubcollections(parentCollection, subcollectionNames) {
  const parentSnapshot = await db.collection(parentCollection).get();

  for (const parentDoc of parentSnapshot.docs) {
    for (const subcollectionName of subcollectionNames) {
      const subcollectionPath = `${parentCollection}/${parentDoc.id}/${subcollectionName}`;
      const subcollectionRef = db.collection(subcollectionPath);
      const subcollectionSnapshot = await subcollectionRef.get();

      if (!subcollectionSnapshot.empty) {
        console.log(`  Deleting subcollection: ${subcollectionPath}`);
        await deleteCollection(subcollectionPath);
      }
    }
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('CLEARING ALL DATA (except users)');
  console.log('='.repeat(50));
  console.log('');

  // First, delete subcollections
  console.log('Step 1: Deleting subcollections...');
  for (const [parent, subs] of Object.entries(SUBCOLLECTIONS)) {
    if (parent !== 'users') { // Skip user integrations
      console.log(`\nProcessing subcollections for: ${parent}`);
      await deleteSubcollections(parent, subs);
    }
  }

  // Then delete main collections
  console.log('\n\nStep 2: Deleting main collections...');
  for (const collection of COLLECTIONS_TO_DELETE) {
    console.log(`\nDeleting: ${collection}`);
    const count = await deleteCollection(collection);
    console.log(`  Total deleted from ${collection}: ${count}`);
  }

  console.log('\n' + '='.repeat(50));
  console.log('DATA CLEAR COMPLETE');
  console.log('Users collection preserved.');
  console.log('='.repeat(50));
}

main().catch(console.error);

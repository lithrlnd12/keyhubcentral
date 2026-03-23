/**
 * migrate-appointments.mjs
 *
 * Fixes appointments and availability that were written to
 * contractors/{authUID}/... instead of contractors/{firestoreDocId}/...
 *
 * Run with:  node scripts/migrate-appointments.mjs
 *
 * Requires GOOGLE_APPLICATION_CREDENTIALS or Firebase service account env vars.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local so the script can pick up FIREBASE_SERVICE_ACCOUNT_KEY
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    // Strip surrounding quotes
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (key) process.env[key] = val;
  }
} catch { /* no .env.local, continue */ }

let app;
const serviceAccountKey =
  process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

if (serviceAccountKey) {
  const credentials = JSON.parse(serviceAccountKey);
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  app = initializeApp({ credential: cert(credentials) });
} else {
  // Fall back to Application Default Credentials
  app = getApps().length ? getApps()[0] : initializeApp();
}

const db = getFirestore(app);

async function migrateSubcollection(wrongParent, correctParent, subcollection) {
  const wrongRef = db.collection(`contractors/${wrongParent}/${subcollection}`);
  const snapshot = await wrongRef.get();

  if (snapshot.empty) return 0;

  console.log(`  Found ${snapshot.size} docs in contractors/${wrongParent}/${subcollection}`);

  let migrated = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const correctRef = db
      .collection(`contractors/${correctParent}/${subcollection}`)
      .doc(doc.id);

    // Write to correct path
    await correctRef.set(data);
    // Delete from wrong path
    await doc.ref.delete();
    migrated++;
    console.log(`    Migrated ${subcollection}/${doc.id}`);
  }
  return migrated;
}

async function main() {
  console.log('=== Appointment & Availability Migration ===\n');

  // Get all contractor documents
  const contractorsSnap = await db.collection('contractors').get();
  console.log(`Found ${contractorsSnap.size} contractor documents.\n`);

  let totalMigrated = 0;

  for (const contractorDoc of contractorsSnap.docs) {
    const contractorId = contractorDoc.id; // real Firestore doc ID
    const userId = contractorDoc.data().userId;

    if (!userId || userId === contractorId) {
      // No mismatch possible
      continue;
    }

    console.log(`Contractor: ${contractorDoc.data().businessName || userId}`);
    console.log(`  Real doc ID : ${contractorId}`);
    console.log(`  Auth UID    : ${userId}`);

    // Check if wrong-path data exists for this user
    const apptCount = await migrateSubcollection(userId, contractorId, 'appointments');
    const availCount = await migrateSubcollection(userId, contractorId, 'availability');

    const total = apptCount + availCount;
    if (total === 0) {
      console.log(`  No misplaced data found.\n`);
    } else {
      console.log(`  Migrated ${total} document(s).\n`);
      totalMigrated += total;
    }
  }

  console.log(`\n=== Done. Total migrated: ${totalMigrated} document(s) ===`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});

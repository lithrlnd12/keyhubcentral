/**
 * Seed Feature Flags — writes config/features doc to Firestore
 * All flags default to true (current behavior preserved).
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-feature-flags.js
 */

'use strict';

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({ projectId: 'key-hub-central' });
}

const db = admin.firestore();

const DEFAULT_FLAGS = {
  core: true,
  leadEngine: true,
  voiceAI: true,
  communications: true,
  marketplace: true,
  reportBuilder: true,
  presentationBuilder: true,
  predictiveAnalytics: true,
  smartScheduling: true,
  customerPortal: true,
  contracts: true,
  remoteSignature: true,
  financials: true,
  emailAutomation: true,
  webhooksAPI: true,
  callCenter: true,
  riskScoring: true,
  offlinePWA: true,
  inventory: true,
};

async function main() {
  console.log('🚩 Seeding feature flags...\n');

  const ref = db.collection('config').doc('features');
  const snap = await ref.get();

  if (snap.exists) {
    console.log('  ⚠️  config/features already exists. Merging new flags only...');
    await ref.set(DEFAULT_FLAGS, { merge: true });
  } else {
    await ref.set(DEFAULT_FLAGS);
  }

  console.log('  ✓ config/features written with all flags = true');
  console.log('\n✅ Done! Feature flags are live. Toggle any flag in Firebase Console');
  console.log('   to test: Firestore → config → features → flip a boolean.\n');
}

main().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});

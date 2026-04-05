// Test push notification delivery end-to-end
// Usage: node scripts/test-push.js [email]
const fs = require('fs');
const path = require('path');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getMessaging } = require('firebase-admin/messaging');

// Parse .env.local for service account
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/FIREBASE_SERVICE_ACCOUNT_KEY=(.*?)(?:\n[A-Z_]+=|\n*$)/s);
if (!match) { console.error('No FIREBASE_SERVICE_ACCOUNT_KEY in .env.local'); process.exit(1); }
const creds = JSON.parse(match[1].trim());
if (creds.private_key) creds.private_key = creds.private_key.replace(/\\n/g, '\n');

const app = initializeApp({ credential: cert(creds) });
const db = getFirestore(app);
const messaging = getMessaging(app);

const targetEmail = process.argv[2];

(async () => {
  // 1. Find user
  console.log('\n--- Step 1: Find user ---');
  let userDoc;
  if (targetEmail) {
    const snap = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
    if (snap.empty) { console.error(`No user with email ${targetEmail}`); process.exit(1); }
    userDoc = snap.docs[0];
  } else {
    // Find first owner/admin
    const snap = await db.collection('users').where('role', 'in', ['owner', 'admin']).limit(1).get();
    if (snap.empty) { console.error('No admin users found'); process.exit(1); }
    userDoc = snap.docs[0];
  }
  const userData = userDoc.data();
  console.log(`User: ${userData.email} (${userData.role})`);
  console.log(`User ID: ${userDoc.id}`);

  // 2. Check notification preferences
  console.log('\n--- Step 2: Check preferences ---');
  const prefs = userData.notificationPreferences;
  if (!prefs) {
    console.log('notificationPreferences: NOT SET (null/undefined)');
  } else {
    console.log(`pushEnabled: ${prefs.pushEnabled}`);
    console.log(`quietHours: enabled=${prefs.quietHours?.enabled}, ${prefs.quietHours?.start}-${prefs.quietHours?.end}`);
    console.log(`messages: ${JSON.stringify(prefs.messages || 'not set')}`);
  }

  // 3. Check FCM tokens
  console.log('\n--- Step 3: Check FCM tokens ---');
  const tokens = userData.fcmTokens || [];
  console.log(`Token count: ${tokens.length}`);
  tokens.forEach((t, i) => {
    if (typeof t === 'string') {
      console.log(`  [${i}] PLAIN STRING (broken format): ${t.substring(0, 30)}...`);
    } else {
      console.log(`  [${i}] device=${t.device}, browser=${t.browser}, token=${t.token?.substring(0, 30)}...`);
    }
  });

  if (tokens.length === 0) {
    console.log('\n*** NO TOKENS FOUND. The Enable button is not saving tokens to Firestore. ***');
    console.log('Go to Settings > Notifications > Enable, then run this script again.');
    process.exit(0);
  }

  // 4. Send test push
  console.log('\n--- Step 4: Sending test push ---');
  const tokenStrings = tokens.map(t => typeof t === 'string' ? t : t.token).filter(Boolean);
  console.log(`Sending to ${tokenStrings.length} token(s)...`);

  const message = {
    tokens: tokenStrings,
    notification: {
      title: 'KeyHub Test Notification',
      body: 'If you see this, push notifications are working!',
    },
    data: {
      type: 'test',
      priority: 'high',
      title: 'KeyHub Test Notification',
      body: 'If you see this, push notifications are working!',
      actionUrl: '/overview',
    },
    webpush: {
      notification: {
        title: 'KeyHub Test Notification',
        body: 'If you see this, push notifications are working!',
        icon: '/logo.svg',
        badge: '/logo.svg',
        requireInteraction: true,
      },
      fcmOptions: {
        link: '/overview',
      },
    },
  };

  try {
    const response = await messaging.sendEachForMulticast(message);
    console.log(`\nResults: ${response.successCount} success, ${response.failureCount} failed`);
    response.responses.forEach((r, i) => {
      if (r.success) {
        console.log(`  [${i}] SUCCESS — message ID: ${r.messageId}`);
      } else {
        console.log(`  [${i}] FAILED — ${r.error?.code}: ${r.error?.message}`);
      }
    });

    if (response.successCount > 0) {
      console.log('\n*** Push sent successfully! You should see a notification. ***');
      console.log('If you do NOT see it:');
      console.log('  - Desktop: Check browser notification settings for this site');
      console.log('  - Mobile: Check system notification settings for the browser/PWA');
      console.log('  - Check Do Not Disturb / Focus mode');
    }
  } catch (err) {
    console.error('\nFCM send error:', err.message);
  }

  process.exit(0);
})();

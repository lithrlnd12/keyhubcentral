import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let systemApp: App;
let systemDb: Firestore;

function getSystemApp(): App {
  // Check if 'keyhub-system' app already exists
  const existing = getApps().find((app) => app.name === 'keyhub-system');
  if (existing) {
    systemApp = existing;
    return systemApp;
  }

  const serviceAccount = process.env.KEYHUB_SYSTEM_SERVICE_ACCOUNT;

  if (serviceAccount) {
    try {
      const credentials = JSON.parse(serviceAccount);
      // Fix private key - replace literal \n with actual newlines
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      systemApp = initializeApp(
        { credential: cert(credentials) },
        'keyhub-system'
      );
    } catch (error) {
      console.error('keyhub-system Admin: Failed to parse service account JSON:', error);
      throw new Error('KEYHUB_SYSTEM_SERVICE_ACCOUNT is not valid JSON');
    }
  } else {
    throw new Error('KEYHUB_SYSTEM_SERVICE_ACCOUNT environment variable is not set');
  }

  return systemApp;
}

export function getSystemDb(): Firestore {
  if (!systemDb) {
    systemDb = getFirestore(getSystemApp());
  }
  return systemDb;
}

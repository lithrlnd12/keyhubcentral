import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';

let adminApp: App;
let adminDb: Firestore;
let adminAuth: Auth;

function getAdminApp(): App {
  if (getApps().length === 0) {
    // In development, use service account from environment variable
    // In production (Vercel), this should be set as a secret
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

    if (serviceAccount) {
      try {
        const credentials = JSON.parse(serviceAccount);
        console.log('Firebase Admin: Using service account credentials for project:', credentials.project_id);
        adminApp = initializeApp({
          credential: cert(credentials),
        });
      } catch (error) {
        console.error('Firebase Admin: Failed to parse service account JSON:', error);
        // If parsing fails, try using application default credentials
        adminApp = initializeApp();
      }
    } else {
      console.warn('Firebase Admin: No FIREBASE_SERVICE_ACCOUNT_KEY or GOOGLE_SERVICE_ACCOUNT_KEY found');
      // Use application default credentials (works in GCP environments)
      adminApp = initializeApp();
    }
  } else {
    adminApp = getApps()[0];
  }

  return adminApp;
}

export function getAdminDb(): Firestore {
  if (!adminDb) {
    adminDb = getFirestore(getAdminApp());
  }
  return adminDb;
}

export function getAdminAuth(): Auth {
  if (!adminAuth) {
    adminAuth = getAuth(getAdminApp());
  }
  return adminAuth;
}

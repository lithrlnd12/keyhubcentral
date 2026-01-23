import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
  UserCredential,
} from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { UserRole, UserStatus, UserProfile } from '@/types/user';
import { calculateDistanceMiles } from '@/lib/utils/distance';

export async function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(
  email: string,
  password: string,
  displayName: string,
  phone?: string,
  requestedRole?: UserRole,
  baseZipCode?: string
): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Create user profile in Firestore with pending status
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    uid: userCredential.user.uid,
    email,
    displayName,
    phone: phone || null,
    role: 'pending' as UserRole,
    status: 'pending' as UserStatus,
    requestedRole: requestedRole || null,
    baseZipCode: baseZipCode || null,
    baseCoordinates: null, // Will be geocoded by Cloud Function
    createdAt: serverTimestamp(),
    approvedAt: null,
    approvedBy: null,
  });

  return userCredential;
}

export async function signOut(): Promise<void> {
  return firebaseSignOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }

  return null;
}

export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export interface UserWithDistance extends UserProfile {
  distance?: number;
}

export interface GetUsersOptions {
  coordinates?: { lat: number; lng: number };
  maxDistanceMiles?: number;
}

export async function getUsersByRole(
  role: UserRole,
  options?: GetUsersOptions
): Promise<UserWithDistance[]> {
  const q = query(
    collection(db, 'users'),
    where('role', '==', role),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);

  return filterUsersByDistance(
    snapshot.docs.map((doc) => doc.data() as UserProfile),
    options
  );
}

export async function getUsersByRoles(
  roles: UserRole[],
  options?: GetUsersOptions
): Promise<UserWithDistance[]> {
  const q = query(
    collection(db, 'users'),
    where('role', 'in', roles),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);

  return filterUsersByDistance(
    snapshot.docs.map((doc) => doc.data() as UserProfile),
    options
  );
}

function filterUsersByDistance(
  users: UserProfile[],
  options?: GetUsersOptions
): UserWithDistance[] {
  const { coordinates, maxDistanceMiles } = options || {};

  // If no coordinates provided, return all users without distance info
  if (!coordinates) {
    return users;
  }

  // Calculate distance for each user with coordinates
  const usersWithDistance: UserWithDistance[] = users
    .map((user) => {
      if (!user.baseCoordinates?.lat || !user.baseCoordinates?.lng) {
        return { ...user, distance: undefined };
      }

      const distance = calculateDistanceMiles(
        coordinates.lat,
        coordinates.lng,
        user.baseCoordinates.lat,
        user.baseCoordinates.lng
      );

      return { ...user, distance };
    })
    .filter((user) => {
      // If no max distance, include all users (those with distance calculated)
      if (!maxDistanceMiles) {
        return true;
      }
      // Filter to only users within max distance
      return user.distance !== undefined && user.distance <= maxDistanceMiles;
    });

  // Sort by distance (closest first), users without coordinates at the end
  usersWithDistance.sort((a, b) => {
    if (a.distance === undefined && b.distance === undefined) return 0;
    if (a.distance === undefined) return 1;
    if (b.distance === undefined) return -1;
    return a.distance - b.distance;
  });

  return usersWithDistance;
}

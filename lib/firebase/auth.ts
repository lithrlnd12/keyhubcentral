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
  baseZipCode?: string,
  selectedPartnerId?: string,
  companyName?: string,
  serviceAddress?: { street: string; city: string; state: string; zip: string }
): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);

  // Customers are auto-activated — no admin approval needed
  const isCustomer = requestedRole === 'customer';

  // First-user-is-owner: if no users exist yet, auto-promote to owner
  let isFirstUser = false;
  if (!isCustomer) {
    try {
      const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', 'in', ['owner', 'admin'])));
      isFirstUser = usersSnapshot.empty;
    } catch {
      // If we can't check (e.g. rules block it), fall through to normal flow
    }
  }

  // Determine role and status
  let assignedRole: UserRole = 'pending';
  let assignedStatus: UserStatus = 'pending';

  if (isFirstUser) {
    assignedRole = 'owner';
    assignedStatus = 'active';
  } else if (isCustomer) {
    assignedRole = 'customer';
    assignedStatus = 'active';
  }

  // Create user profile in Firestore
  await setDoc(doc(db, 'users', userCredential.user.uid), {
    uid: userCredential.user.uid,
    email,
    displayName,
    phone: phone || null,
    role: assignedRole,
    status: assignedStatus,
    requestedRole: requestedRole || null,
    selectedPartnerId: selectedPartnerId || null,
    companyName: companyName || null,
    baseZipCode: baseZipCode || null,
    baseCoordinates: null, // Will be geocoded by Cloud Function
    serviceAddress: serviceAddress || null,
    createdAt: serverTimestamp(),
    ...(isFirstUser ? { approvedAt: serverTimestamp(), approvedBy: 'auto-first-user' } : {}),
    ...(isCustomer ? { approvedAt: serverTimestamp(), approvedBy: 'auto' } : {}),
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
  const usersWithDistance: UserWithDistance[] = users.map((user) => {
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
  });

  // Separate users into: within range, out of range, and no coordinates
  const withinRange: UserWithDistance[] = [];
  const noCoordinates: UserWithDistance[] = [];

  for (const user of usersWithDistance) {
    if (user.distance === undefined) {
      // User has no coordinates - include as fallback
      noCoordinates.push(user);
    } else if (!maxDistanceMiles || user.distance <= maxDistanceMiles) {
      // User is within range (or no max distance set)
      withinRange.push(user);
    }
    // Users out of range are excluded
  }

  // Sort within-range users by distance (closest first)
  withinRange.sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0));

  // Sort no-coordinate users by name
  noCoordinates.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

  // Return within-range first, then no-coordinates as fallback
  return [...withinRange, ...noCoordinates];
}

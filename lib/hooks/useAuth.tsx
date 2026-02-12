'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  signOut as firebaseSignOut,
  resetPassword as firebaseResetPassword,
  getUserProfile,
  onAuthChange,
} from '@/lib/firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { UserProfile, AuthContextType, UserRole } from '@/types/user';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthChange(async (firebaseUser: User | null) => {
      // Clean up previous profile subscription
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (firebaseUser) {
        setLoading(true);
        setError(null);

        // Subscribe to user profile in realtime
        const userRef = doc(db, 'users', firebaseUser.uid);
        unsubscribeProfile = onSnapshot(
          userRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUser({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
            } else {
              setUser(null);
            }
            setLoading(false);
          },
          (err) => {
            console.error('Error subscribing to user profile:', err);
            setError('Failed to load user profile');
            setUser(null);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignIn(email, password);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Sign in failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    phone?: string,
    requestedRole?: UserRole,
    baseZipCode?: string,
    selectedPartnerId?: string,
    companyName?: string
  ) => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignUp(email, password, displayName, phone, requestedRole, baseZipCode, selectedPartnerId, companyName);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Sign up failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setError(null);
    try {
      await firebaseSignOut();
      setUser(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Sign out failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    setError(null);
    try {
      await firebaseResetPassword(email);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Password reset failed';
      setError(errorMessage);
      throw err;
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    const currentUser = auth?.currentUser;
    if (!currentUser) return null;
    return currentUser.getIdToken();
  };

  const value: AuthContextType = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    getIdToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

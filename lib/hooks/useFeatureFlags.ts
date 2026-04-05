'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { FeatureFlags, DEFAULT_FLAGS, resolveFlags } from '@/types/featureFlags';

/**
 * Real-time feature flag hook.
 * Reads from Firestore `config/features` doc.
 * Falls back to all-true (DEFAULT_FLAGS) if doc doesn't exist.
 * Enforces dependency rules via resolveFlags().
 */
export function useFeatureFlags(): { flags: FeatureFlags; loading: boolean } {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FLAGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ref = doc(db, 'config', 'features');

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as Partial<FeatureFlags>;
          setFlags(resolveFlags(data));
        } else {
          // Doc doesn't exist — everything on (current behavior)
          setFlags(DEFAULT_FLAGS);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Failed to load feature flags:', error);
        // On error, default to everything on so nothing breaks
        setFlags(DEFAULT_FLAGS);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return { flags, loading };
}

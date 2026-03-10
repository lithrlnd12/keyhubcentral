'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks/useAuth';

interface DispatchButtonProps {
  jobId: string;
  jobStatus: string;
}

interface DispatchCandidate {
  contractorId: string;
  name: string;
  phone: string;
  score: number;
  callStatus: 'pending' | 'calling' | 'accepted' | 'declined' | 'no_answer' | 'failed';
}

interface DispatchSession {
  id: string;
  status: 'active' | 'completed' | 'failed' | 'cancelled';
  candidates: DispatchCandidate[];
  currentIndex: number;
  assignedContractorId?: string;
}

export default function DispatchButton({ jobId, jobStatus }: DispatchButtonProps) {
  const { user, getIdToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<DispatchSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Only show for production/scheduled jobs
  const canDispatch = ['production', 'scheduled'].includes(jobStatus);

  // Subscribe to dispatch session updates
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'dispatchSessions', sessionId),
      (snap) => {
        if (snap.exists()) {
          setSession({ id: snap.id, ...snap.data() } as DispatchSession);
        }
      }
    );

    return () => unsubscribe();
  }, [sessionId]);

  const handleDispatch = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/voice/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start dispatch');
      }

      const data = await res.json();
      setSessionId(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dispatch failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!sessionId || !user) return;
    setLoading(true);

    try {
      const token = await getIdToken();
      await fetch('/api/voice/dispatch', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sessionId }),
      });
      setSessionId(null);
      setSession(null);
    } catch {
      // Ignore cancel errors
    } finally {
      setLoading(false);
    }
  };

  if (!canDispatch) return null;

  // Active session — show progress
  if (session) {
    const currentCandidate = session.candidates[session.currentIndex];
    const attempted = session.candidates.filter(
      (c) => c.callStatus !== 'pending'
    ).length;

    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-zinc-200">AI Dispatch</h3>
          {session.status === 'active' && (
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Cancel
            </button>
          )}
        </div>

        {session.status === 'completed' && (
          <div className="text-sm text-green-400">
            Crew assigned: {session.candidates.find((c) => c.callStatus === 'accepted')?.name}
          </div>
        )}

        {session.status === 'failed' && (
          <div className="text-sm text-red-400">
            No contractors available. {attempted} attempted.
          </div>
        )}

        {session.status === 'cancelled' && (
          <div className="text-sm text-zinc-400">Dispatch cancelled.</div>
        )}

        {session.status === 'active' && (
          <>
            <div className="text-sm text-zinc-300 mb-2">
              Calling {currentCandidate?.name || '...'}
              <span className="text-zinc-500 ml-2">
                ({attempted + 1} of {session.candidates.length})
              </span>
            </div>
            <div className="flex gap-1">
              {session.candidates.map((c, i) => (
                <div
                  key={c.contractorId}
                  className={`h-2 flex-1 rounded-full ${
                    c.callStatus === 'accepted'
                      ? 'bg-green-500'
                      : c.callStatus === 'declined' || c.callStatus === 'no_answer' || c.callStatus === 'failed'
                        ? 'bg-red-500/60'
                        : c.callStatus === 'calling'
                          ? 'bg-yellow-500 animate-pulse'
                          : 'bg-zinc-600'
                  }`}
                  title={`${c.name}: ${c.callStatus}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={handleDispatch}
        disabled={loading}
        className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-50"
      >
        {loading ? (
          <>
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Starting...
          </>
        ) : (
          <>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
            </svg>
            Dispatch Crew
          </>
        )}
      </button>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}

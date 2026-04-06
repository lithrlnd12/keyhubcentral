'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { RemoteSigningSession } from '@/types/remoteSignature';
import { getSigningSessionsForContract } from '@/lib/firebase/remoteSignatures';
import { useAuth } from '@/lib/hooks/useAuth';
import { useTranslation } from '@/lib/hooks/useTranslation';

interface RemoteSigningButtonProps {
  contractId: string;
  jobId: string;
  recipientEmail?: string;
  recipientName?: string;
}

export function RemoteSigningButton({
  contractId,
  jobId,
  recipientEmail: initialEmail,
  recipientName: initialName,
}: RemoteSigningButtonProps) {
  const { getIdToken } = useAuth();
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState(initialEmail || '');
  const [name, setName] = useState(initialName || '');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [sessions, setSessions] = useState<RemoteSigningSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  // Load existing sessions for this contract
  useEffect(() => {
    async function loadSessions() {
      try {
        const results = await getSigningSessionsForContract(contractId);
        setSessions(results);
      } catch (err) {
        console.error('Failed to load signing sessions:', err);
      } finally {
        setLoadingSessions(false);
      }
    }
    loadSessions();
  }, [contractId]);

  const handleSubmit = async () => {
    if (!email || !name) return;
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/contracts/remote-sign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contractId, jobId, recipientEmail: email, recipientName: name }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || t('Failed to send signing link'));
      }

      setSuccess(true);
      setShowForm(false);

      // Refresh sessions
      const updated = await getSigningSessionsForContract(contractId);
      setSessions(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to send signing link'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: t('Pending') },
      viewed: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: t('Viewed') },
      signed: { bg: 'bg-green-500/10', text: 'text-green-500', label: t('Signed') },
      expired: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: t('Expired') },
      cancelled: { bg: 'bg-red-500/10', text: 'text-red-500', label: t('Cancelled') },
    };
    const s = statusStyles[status] || statusStyles.pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Existing sessions */}
      {!loadingSessions && sessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
            {t('Remote Signing Sessions')}
          </p>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm"
            >
              <div>
                <span className="text-gray-300">{session.recipientName}</span>
                <span className="text-gray-500 ml-2 text-xs">{session.recipientEmail}</span>
              </div>
              {getStatusBadge(session.status)}
            </div>
          ))}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-3 text-sm text-green-400">
          {t('Signing link sent successfully!')}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Inline form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('Recipient Name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Full name')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">{t('Recipient Email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading || !email || !name}
            >
              {loading ? t('Sending...') : t('Send Signing Link')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setError('');
              }}
            >
              {t('Cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Toggle button */}
      {!showForm && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowForm(true);
            setSuccess(false);
            setError('');
          }}
        >
          {t('Send for Remote Signature')}
        </Button>
      )}
    </div>
  );
}

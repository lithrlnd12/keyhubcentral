'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/lib/hooks/useAuth';
import { getCalendarIntegration } from '@/lib/firebase/calendarIntegration';
import { GoogleCalendarIntegration } from '@/types/calendarIntegration';
import { getFunctions, httpsCallable } from 'firebase/functions';

interface GoogleCalendarConnectProps {
  returnUrl?: string;
}

export function GoogleCalendarConnect({
  returnUrl = '/portal/settings',
}: GoogleCalendarConnectProps) {
  const { user, getIdToken } = useAuth();
  const [integration, setIntegration] = useState<GoogleCalendarIntegration | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const loadIntegration = useCallback(async () => {
    if (!user?.uid) return;

    try {
      const data = await getCalendarIntegration(user.uid);
      setIntegration(data);
    } catch (error) {
      console.error('Error loading calendar integration:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadIntegration();
  }, [loadIntegration]);

  const handleConnect = async () => {
    if (!user?.uid) return;

    setConnecting(true);
    try {
      // Get fresh ID token for auth
      const token = await getIdToken();

      const response = await fetch('/api/google-calendar/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.uid, returnUrl }),
      });

      const data = await response.json();

      if (response.ok && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        console.error('Failed to get auth URL:', data.error);
      }
    } catch (error) {
      console.error('Error connecting calendar:', error);
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user?.uid) return;

    setDisconnecting(true);
    try {
      // Get fresh ID token for auth
      const token = await getIdToken();

      const response = await fetch('/api/google-calendar/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      if (response.ok) {
        setIntegration(null);
      }
    } catch (error) {
      console.error('Error disconnecting calendar:', error);
    } finally {
      setDisconnecting(false);
    }
  };

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const functions = getFunctions();
      const manualSync = httpsCallable(functions, 'manualCalendarSync');
      await manualSync();
      await loadIntegration();
    } catch (error) {
      console.error('Error syncing calendar:', error);
    } finally {
      setSyncing(false);
    }
  };

  const formatLastSync = (timestamp: { toDate: () => Date } | null) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  const getSyncStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'syncing':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  const getSyncStatusText = (status?: string) => {
    switch (status) {
      case 'success':
        return 'Synced';
      case 'error':
        return 'Error';
      case 'syncing':
        return 'Syncing...';
      case 'pending':
        return 'Pending';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 bg-gray-700 rounded-lg" />
            <div>
              <div className="h-5 w-32 bg-gray-700 rounded mb-2" />
              <div className="h-4 w-48 bg-gray-700 rounded" />
            </div>
          </div>
          <div className="h-10 w-24 bg-gray-700 rounded" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Google Calendar Icon */}
          <div className="flex items-center justify-center h-10 w-10 bg-brand-gold/10 rounded-lg">
            <svg
              className="h-6 w-6 text-brand-gold"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
            </svg>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white">Google Calendar</h3>
            <p className="text-sm text-gray-400">
              {integration?.enabled
                ? 'Connected - syncing every 15 minutes'
                : 'Connect to sync your availability with Google Calendar'}
            </p>
          </div>
        </div>

        {integration?.enabled ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleManualSync}
              disabled={syncing}
            >
              {syncing ? (
                <svg
                  className="animate-spin h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              )}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
              loading={disconnecting}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} disabled={connecting} loading={connecting}>
            Connect Calendar
          </Button>
        )}
      </div>

      {integration?.enabled && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-400">Status:</span>
              <span className={getSyncStatusColor(integration.lastSyncStatus)}>
                {getSyncStatusText(integration.lastSyncStatus)}
              </span>
            </div>
            <div className="text-gray-500">
              Last synced: {formatLastSync(integration.lastSyncAt)}
            </div>
          </div>

          {integration.lastSyncError && (
            <div className="mt-2 text-sm text-red-400 bg-red-400/10 rounded-lg p-3">
              {integration.lastSyncError}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

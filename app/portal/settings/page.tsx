'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardTitle } from '@/components/ui/Card';
import { BackButton } from '@/components/ui';
import { GoogleCalendarConnect } from '@/components/integrations';
import { useToast } from '@/components/ui/Toast';

export default function PortalSettingsPage() {
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    // Check for calendar connection status from OAuth callback
    const calendarConnected = searchParams.get('calendarConnected');
    const calendarError = searchParams.get('calendarError');

    if (calendarConnected === 'true') {
      showToast('Google Calendar connected successfully!', 'success');
      setShowSuccess(true);
      // Clean up URL
      window.history.replaceState({}, '', '/portal/settings');
    } else if (calendarError) {
      const errorMessages: Record<string, string> = {
        missing_params: 'Missing required parameters from Google.',
        invalid_state: 'Invalid authentication state. Please try again.',
        missing_user: 'User information not found. Please try again.',
        missing_tokens: 'Failed to get access tokens from Google.',
        access_denied: 'You denied access to Google Calendar.',
        server_error: 'An error occurred. Please try again.',
      };
      showToast(
        errorMessages[calendarError] || 'Failed to connect Google Calendar.',
        'error'
      );
      // Clean up URL
      window.history.replaceState({}, '', '/portal/settings');
    }
  }, [searchParams, showToast]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/portal" />
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your account settings and integrations
          </p>
        </div>
      </div>

      {/* Integrations Section */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Integrations</h2>
        <div className="space-y-4">
          <GoogleCalendarConnect returnUrl="/portal/settings" />
        </div>
      </section>

      {/* How It Works Section */}
      <Card>
        <CardTitle>How Calendar Sync Works</CardTitle>
        <div className="mt-4 space-y-4 text-sm text-gray-400">
          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-6 w-6 bg-brand-gold/10 rounded-full text-brand-gold text-xs font-bold">
              1
            </div>
            <div>
              <p className="text-white font-medium">App to Google Calendar</p>
              <p>
                When you set your availability (busy, unavailable, on leave) in KeyHub,
                it automatically creates events in your Google Calendar.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-6 w-6 bg-brand-gold/10 rounded-full text-brand-gold text-xs font-bold">
              2
            </div>
            <div>
              <p className="text-white font-medium">Google Calendar to App</p>
              <p>
                Events on your Google Calendar that show as &quot;busy&quot; will automatically
                mark those days as busy in KeyHub. Syncs every 15 minutes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex items-center justify-center h-6 w-6 bg-brand-gold/10 rounded-full text-brand-gold text-xs font-bold">
              3
            </div>
            <div>
              <p className="text-white font-medium">Two-Way Sync</p>
              <p>
                Your availability stays in sync between KeyHub and Google Calendar
                automatically, so you never double-book.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

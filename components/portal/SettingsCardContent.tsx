'use client';

import { GoogleCalendarConnect } from '@/components/integrations';

export function SettingsCardContent() {
  return (
    <div className="space-y-4">
      {/* Integrations */}
      <div>
        <h4 className="text-sm font-medium text-gray-400 mb-3">Integrations</h4>
        <GoogleCalendarConnect returnUrl="/portal" compact />
      </div>

      {/* How It Works */}
      <div className="bg-gray-800/50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-white mb-3">Calendar Sync</h4>
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex items-start gap-2">
            <span className="text-gold font-bold">1.</span>
            <p>Availability in KeyHub syncs to Google Calendar</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gold font-bold">2.</span>
            <p>Busy events in Google mark you busy in KeyHub</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-gold font-bold">3.</span>
            <p>Two-way sync prevents double-booking</p>
          </div>
        </div>
      </div>
    </div>
  );
}

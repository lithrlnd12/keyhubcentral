'use client';

import { GoogleCalendarOnlyView } from '@/components/portal';

export default function AdminCalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendar</h1>
        <p className="text-gray-400 mt-1">
          Your Google Calendar events and schedule
        </p>
      </div>

      <GoogleCalendarOnlyView settingsHref="/settings" />
    </div>
  );
}

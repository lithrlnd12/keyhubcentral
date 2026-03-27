'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BookingWidget } from '@/components/calendar/BookingWidget';

function ScheduleContent() {
  const searchParams = useSearchParams();
  const contractorId = searchParams.get('contractorId') || undefined;
  const trade = searchParams.get('trade') || undefined;
  const theme = searchParams.get('theme'); // 'light' or omitted for dark
  const accent = searchParams.get('accent') || undefined; // hex color without #

  return (
    <div className="min-h-screen flex items-start justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="text-center mb-6">
          <h1
            className={
              theme === 'light'
                ? 'text-2xl font-bold text-gray-900'
                : 'text-2xl font-bold text-white'
            }
          >
            Book an Appointment
          </h1>
          <p
            className={
              theme === 'light' ? 'text-sm text-gray-500 mt-1' : 'text-sm text-gray-400 mt-1'
            }
          >
            {trade
              ? `Schedule your ${trade.toLowerCase()} service`
              : 'Schedule a service with a qualified pro'}
          </p>
        </div>

        {contractorId ? (
          <BookingWidget
            contractorId={contractorId}
            trade={trade}
            lightTheme={theme === 'light'}
            accentColor={accent ? `#${accent}` : undefined}
          />
        ) : (
          <div
            className={
              theme === 'light'
                ? 'text-center py-12 text-gray-500'
                : 'text-center py-12 text-gray-400'
            }
          >
            <p className="text-sm">
              No contractor specified. Please use a valid booking link.
            </p>
          </div>
        )}

        {/* Footer */}
        <p
          className={
            theme === 'light'
              ? 'text-center text-xs text-gray-400 mt-6'
              : 'text-center text-xs text-gray-600 mt-6'
          }
        >
          Powered by KeyHub Central
        </p>
      </div>
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-gray-400 border-t-transparent rounded-full" />
        </div>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}

'use client';

import { useState } from 'react';
import {
  CheckCircle,
  Calendar,
  Clock,
  Phone,
  FileText,
  Download,
  ExternalLink,
  XCircle,
  Loader2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CalendarAppointment } from '@/components/portal/CalendarDayDetail';
import { TIME_BLOCK_CONFIG } from '@/types/availability';
import { cancelAppointment } from '@/lib/firebase/appointments';

interface AppointmentConfirmationProps {
  appointment: CalendarAppointment;
  contractorId: string;
  lightTheme?: boolean;
  accentColor?: string;
  onBookAnother?: () => void;
}

/**
 * Generate a Google Calendar URL for the appointment.
 */
function buildGoogleCalendarUrl(appointment: CalendarAppointment): string {
  const config = TIME_BLOCK_CONFIG[appointment.timeBlock];
  const dateStr = appointment.date.replace(/-/g, '');

  // Format start/end as full-day times based on the time block
  const startHour = String(config.start).padStart(2, '0');
  const endHour = String(config.end).padStart(2, '0');
  const start = `${dateStr}T${startHour}0000`;
  const end = `${dateStr}T${endHour}0000`;

  const title = encodeURIComponent(`Appointment with ${appointment.customerName}`);
  const details = encodeURIComponent(
    appointment.description || 'Service appointment'
  );

  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}`;
}

/**
 * Generate an .ics file content and trigger a download.
 */
function downloadIcsFile(appointment: CalendarAppointment) {
  const config = TIME_BLOCK_CONFIG[appointment.timeBlock];
  const dateStr = appointment.date.replace(/-/g, '');
  const startHour = String(config.start).padStart(2, '0');
  const endHour = String(config.end).padStart(2, '0');

  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KeyHub Central//Booking//EN',
    'BEGIN:VEVENT',
    `DTSTART:${dateStr}T${startHour}0000`,
    `DTEND:${dateStr}T${endHour}0000`,
    `DTSTAMP:${stamp}`,
    `SUMMARY:Appointment - ${appointment.customerName}`,
    `DESCRIPTION:${(appointment.description || 'Service appointment').replace(/\n/g, '\\n')}`,
    `STATUS:CONFIRMED`,
    `UID:${appointment.id}@keyhubcentral.com`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointment-${appointment.date}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AppointmentConfirmation({
  appointment,
  contractorId,
  lightTheme = false,
  accentColor,
  onBookAnother,
}: AppointmentConfirmationProps) {
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const accent = accentColor || '#D4AF37';
  const config = TIME_BLOCK_CONFIG[appointment.timeBlock];

  // Theme
  const t = lightTheme
    ? {
        text: 'text-gray-900',
        textMuted: 'text-gray-500',
        textSecondary: 'text-gray-600',
        card: 'bg-gray-50 border-gray-200',
        successBg: 'bg-green-50 border-green-200',
        cancelBg: 'bg-red-50 border-red-200',
      }
    : {
        text: 'text-white',
        textMuted: 'text-gray-500',
        textSecondary: 'text-gray-400',
        card: 'bg-gray-800 border-gray-700',
        successBg: 'bg-green-500/10 border-green-500/30',
        cancelBg: 'bg-red-500/10 border-red-500/30',
      };

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelAppointment(contractorId, appointment.id);
      setCancelled(true);
    } catch {
      setCancelError('Failed to cancel. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const formattedDate = new Date(appointment.date + 'T00:00:00').toLocaleDateString(
    'en-US',
    { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }
  );

  if (cancelled) {
    return (
      <div className="text-center py-6">
        <XCircle className="w-10 h-10 mx-auto mb-3 text-red-400" />
        <h3 className={cn('text-lg font-semibold mb-1', t.text)}>
          Appointment Cancelled
        </h3>
        <p className={cn('text-sm', t.textMuted)}>
          Your appointment has been cancelled.
        </p>
        {onBookAnother && (
          <button
            onClick={onBookAnother}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium"
            style={{ color: accent }}
          >
            <Plus className="w-4 h-4" />
            Book Another
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success header */}
      <div className="text-center">
        <CheckCircle className="w-10 h-10 mx-auto mb-2" style={{ color: accent }} />
        <h3 className={cn('text-lg font-semibold', t.text)}>Booking Confirmed</h3>
        <p className={cn('text-sm mt-0.5', t.textMuted)}>
          You are all set. See details below.
        </p>
      </div>

      {/* Appointment details */}
      <div className={cn('rounded-lg border p-4 space-y-3', t.card)}>
        <div className="flex items-start gap-3">
          <Calendar className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
          <div>
            <div className={cn('text-sm font-medium', t.text)}>{formattedDate}</div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
          <div>
            <div className={cn('text-sm font-medium', t.text)}>
              {config.label}
            </div>
            <div className={cn('text-xs', t.textMuted)}>
              {config.start > 12
                ? `${config.start - 12}:00 PM`
                : config.start === 12
                  ? '12:00 PM'
                  : `${config.start}:00 AM`}
              {' - '}
              {config.end > 12
                ? `${config.end - 12}:00 PM`
                : config.end === 12
                  ? '12:00 PM'
                  : `${config.end}:00 AM`}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
          <div className={cn('text-sm', t.text)}>{appointment.customerPhone}</div>
        </div>

        {appointment.description && (
          <div className="flex items-start gap-3">
            <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: accent }} />
            <div className={cn('text-sm', t.textSecondary)}>{appointment.description}</div>
          </div>
        )}
      </div>

      {/* Add to Calendar actions */}
      <div className="flex flex-col sm:flex-row gap-2">
        <a
          href={buildGoogleCalendarUrl(appointment)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
            t.card
          )}
        >
          <ExternalLink className="w-4 h-4" />
          Google Calendar
        </a>
        <button
          onClick={() => downloadIcsFile(appointment)}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors',
            t.card
          )}
        >
          <Download className="w-4 h-4" />
          Download .ics
        </button>
      </div>

      {/* Cancel */}
      {cancelError && (
        <p className="text-sm text-red-400">{cancelError}</p>
      )}
      <button
        onClick={handleCancel}
        disabled={cancelling}
        className="w-full py-2.5 rounded-lg border border-red-500/30 text-red-400 text-sm font-medium transition-colors hover:bg-red-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {cancelling ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Cancelling...
          </>
        ) : (
          <>
            <XCircle className="w-4 h-4" />
            Cancel Appointment
          </>
        )}
      </button>

      {/* Book another */}
      {onBookAnother && (
        <div className="text-center">
          <button
            onClick={onBookAnother}
            className="text-sm font-medium"
            style={{ color: accent }}
          >
            Book Another Appointment
          </button>
        </div>
      )}
    </div>
  );
}

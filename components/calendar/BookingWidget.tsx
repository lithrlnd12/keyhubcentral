'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TimeBlock,
  TIME_BLOCKS,
  TIME_BLOCK_CONFIG,
  formatDateKey,
} from '@/types/availability';
import { getAvailability } from '@/lib/firebase/availability';
import {
  createAppointmentAtomic,
  NewAppointment,
} from '@/lib/firebase/appointments';
import { CalendarAppointment } from '@/components/portal/CalendarDayDetail';
import { AppointmentConfirmation } from './AppointmentConfirmation';

interface BookingWidgetProps {
  contractorId?: string;
  trade?: string;
  onBooked?: (appointment: CalendarAppointment) => void;
  /** Use light theme (for customer-facing embeds) */
  lightTheme?: boolean;
  /** Accent color override for tenant branding (hex) */
  accentColor?: string;
}

type Step = 1 | 2 | 3 | 4;

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface ContactInfo {
  name: string;
  phone: string;
  email: string;
  description: string;
}

export function BookingWidget({
  contractorId,
  trade,
  onBooked,
  lightTheme = false,
  accentColor,
}: BookingWidgetProps) {
  const [step, setStep] = useState<Step>(1);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfo>({
    name: '',
    phone: '',
    email: '',
    description: '',
  });
  const [availableBlocks, setAvailableBlocks] = useState<TimeBlock[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookedAppointment, setBookedAppointment] = useState<CalendarAppointment | null>(null);

  // Theme classes
  const t = useMemo(() => {
    if (lightTheme) {
      return {
        bg: 'bg-white',
        card: 'bg-gray-50 border-gray-200',
        text: 'text-gray-900',
        textMuted: 'text-gray-500',
        textSecondary: 'text-gray-600',
        border: 'border-gray-200',
        inputBg: 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400',
        inputFocus: 'focus:ring-2 focus:ring-offset-1',
        dayBg: 'bg-gray-100 hover:bg-gray-200',
        dayDisabled: 'text-gray-300 cursor-not-allowed',
        daySelected: 'ring-2',
        blockBg: 'bg-white border-gray-200 hover:border-gray-400',
        blockSelected: 'ring-2',
        stepBg: 'bg-gray-200',
        stepActive: '',
        stepDone: '',
      };
    }
    return {
      bg: 'bg-brand-black',
      card: 'bg-brand-charcoal border-gray-800',
      text: 'text-white',
      textMuted: 'text-gray-500',
      textSecondary: 'text-gray-400',
      border: 'border-gray-800',
      inputBg: 'bg-gray-800 border-gray-700 text-white placeholder:text-gray-500',
      inputFocus: 'focus:ring-2 focus:ring-offset-1 focus:ring-offset-brand-black',
      dayBg: 'bg-gray-800/50 hover:bg-gray-700/50',
      dayDisabled: 'text-gray-700 cursor-not-allowed',
      daySelected: 'ring-2',
      blockBg: 'bg-gray-800 border-gray-700 hover:border-gray-500',
      blockSelected: 'ring-2',
      stepBg: 'bg-gray-700',
      stepActive: '',
      stepDone: '',
    };
  }, [lightTheme]);

  // Accent style for dynamic tenant branding
  const accent = accentColor || '#D4AF37'; // brand-gold fallback
  const accentStyle = {
    '--accent': accent,
  } as React.CSSProperties;

  // Calendar grid computation
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < startPadding; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [year, month]);

  const canGoPrev = new Date(year, month, 1) > today;

  // Load available time blocks when a date is selected
  const handleDateSelect = useCallback(
    async (date: Date) => {
      if (!contractorId) return;

      setSelectedDate(date);
      setSelectedBlock(null);
      setError(null);
      setLoadingBlocks(true);

      try {
        const availability = await getAvailability(contractorId, date);
        const blocks: TimeBlock[] = [];

        for (const block of TIME_BLOCKS) {
          const status = availability?.blocks?.[block] ?? 'available';
          if (status === 'available') {
            blocks.push(block);
          }
        }

        setAvailableBlocks(blocks);
        setStep(2);
      } catch {
        setError('Failed to load availability. Please try again.');
      } finally {
        setLoadingBlocks(false);
      }
    },
    [contractorId]
  );

  const handleBlockSelect = (block: TimeBlock) => {
    setSelectedBlock(block);
    setError(null);
    setStep(3);
  };

  const handleContactChange = (field: keyof ContactInfo, value: string) => {
    setContactInfo((prev) => ({ ...prev, [field]: value }));
  };

  const isContactValid =
    contactInfo.name.trim().length >= 2 &&
    contactInfo.phone.trim().length >= 7;

  const handleSubmit = async () => {
    if (!contractorId || !selectedDate || !selectedBlock || !isContactValid) return;

    setSubmitting(true);
    setError(null);

    const appointment: NewAppointment = {
      date: formatDateKey(selectedDate),
      timeBlock: selectedBlock,
      customerName: contactInfo.name.trim(),
      customerPhone: contactInfo.phone.trim(),
      description: contactInfo.description.trim() || undefined,
      status: 'scheduled',
      source: 'app',
    };

    try {
      const id = await createAppointmentAtomic(contractorId, appointment);
      const created: CalendarAppointment = { id, ...appointment };
      setBookedAppointment(created);
      setStep(4);
      onBooked?.(created);
    } catch (err: any) {
      if (err?.message?.includes('CONFLICT')) {
        setError('This time is no longer available. Please select a different time.');
        setSelectedBlock(null);
        setStep(2);
        // Refresh available blocks
        handleDateSelect(selectedDate);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const goBack = () => {
    setError(null);
    if (step === 2) {
      setSelectedBlock(null);
      setStep(1);
    } else if (step === 3) {
      setSelectedBlock(null);
      setStep(2);
    }
  };

  const resetBooking = () => {
    setStep(1);
    setSelectedDate(null);
    setSelectedBlock(null);
    setContactInfo({ name: '', phone: '', email: '', description: '' });
    setBookedAppointment(null);
    setError(null);
  };

  // Step 4: Confirmation
  if (step === 4 && bookedAppointment && contractorId) {
    return (
      <div className={cn('rounded-xl p-4', t.bg)} style={accentStyle}>
        <AppointmentConfirmation
          appointment={bookedAppointment}
          contractorId={contractorId}
          lightTheme={lightTheme}
          accentColor={accent}
          onBookAnother={resetBooking}
        />
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border', t.bg, t.border)} style={accentStyle}>
      {/* Progress indicator */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={cn(
              'h-1.5 flex-1 rounded-full transition-colors',
              s <= step ? '' : t.stepBg
            )}
            style={s <= step ? { backgroundColor: accent } : undefined}
          />
        ))}
      </div>

      {/* Header */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          {step > 1 && step < 4 && (
            <button
              onClick={goBack}
              className={cn('p-1 rounded-lg transition-colors', t.textSecondary)}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <h3 className={cn('text-lg font-semibold', t.text)}>
            {step === 1 && 'Select a Date'}
            {step === 2 && 'Select a Time'}
            {step === 3 && 'Your Information'}
          </h3>
        </div>
        {trade && (
          <p className={cn('text-sm mt-0.5', t.textMuted)}>
            {trade}
          </p>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="px-4 pb-4">
        {/* Step 1: Date selection */}
        {step === 1 && (
          <div>
            {/* Month navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() =>
                  canGoPrev && setCurrentMonth(new Date(year, month - 1, 1))
                }
                disabled={!canGoPrev}
                className={cn(
                  'p-1 rounded-lg transition-colors',
                  canGoPrev ? t.textSecondary : 'opacity-30 cursor-not-allowed'
                )}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className={cn('text-sm font-medium', t.text)}>
                {MONTHS[month]} {year}
              </span>
              <button
                onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}
                className={cn('p-1 rounded-lg transition-colors', t.textSecondary)}
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day of week headers */}
            <div className="grid grid-cols-7 gap-1 mb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div
                  key={d}
                  className={cn('text-center text-xs font-medium py-1', t.textMuted)}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={idx} className="aspect-square" />;

                const isPast = day < today;
                const isToday = day.toDateString() === today.toDateString();
                const isSelected =
                  selectedDate && day.toDateString() === selectedDate.toDateString();

                if (isPast && !isToday) {
                  return (
                    <div
                      key={idx}
                      className={cn(
                        'aspect-square flex items-center justify-center text-sm rounded-lg',
                        t.dayDisabled
                      )}
                    >
                      {day.getDate()}
                    </div>
                  );
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleDateSelect(day)}
                    disabled={loadingBlocks}
                    className={cn(
                      'aspect-square flex items-center justify-center text-sm rounded-lg transition-all',
                      t.dayBg,
                      t.text,
                      isSelected && t.daySelected,
                      isToday && 'font-bold'
                    )}
                    style={
                      isSelected
                        ? { borderColor: accent, boxShadow: `0 0 0 2px ${accent}` }
                        : undefined
                    }
                  >
                    {loadingBlocks && isSelected ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      day.getDate()
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Time block selection */}
        {step === 2 && selectedDate && (
          <div className="space-y-3">
            <p className={cn('text-sm', t.textSecondary)}>
              <Calendar className="w-4 h-4 inline-block mr-1 -mt-0.5" />
              {selectedDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>

            {loadingBlocks ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: accent }} />
              </div>
            ) : availableBlocks.length === 0 ? (
              <div className="text-center py-8">
                <Clock className={cn('w-8 h-8 mx-auto mb-2', t.textMuted)} />
                <p className={cn('text-sm', t.textMuted)}>
                  No available times on this date.
                </p>
                <button
                  onClick={() => setStep(1)}
                  className="mt-3 text-sm font-medium underline"
                  style={{ color: accent }}
                >
                  Choose another date
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {availableBlocks.map((block) => {
                  const config = TIME_BLOCK_CONFIG[block];
                  const isSelected = selectedBlock === block;
                  return (
                    <button
                      key={block}
                      onClick={() => handleBlockSelect(block)}
                      className={cn(
                        'w-full p-4 rounded-lg border text-left transition-all flex items-center gap-3',
                        t.blockBg,
                        isSelected && t.blockSelected
                      )}
                      style={
                        isSelected
                          ? { borderColor: accent, boxShadow: `0 0 0 2px ${accent}` }
                          : undefined
                      }
                    >
                      <Clock className="w-5 h-5" style={{ color: accent }} />
                      <div>
                        <div className={cn('font-medium', t.text)}>{config.label}</div>
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
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Contact info */}
        {step === 3 && selectedDate && selectedBlock && (
          <div className="space-y-4">
            {/* Summary bar */}
            <div
              className={cn('p-3 rounded-lg text-sm flex items-center gap-3', lightTheme ? 'bg-gray-100' : 'bg-gray-800')}
            >
              <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
              <span className={t.text}>
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <Clock className="w-4 h-4 flex-shrink-0" style={{ color: accent }} />
              <span className={t.text}>{TIME_BLOCK_CONFIG[selectedBlock].label}</span>
            </div>

            {/* Name */}
            <div>
              <label className={cn('flex items-center gap-1.5 text-sm font-medium mb-1.5', t.textSecondary)}>
                <User className="w-4 h-4" />
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={contactInfo.name}
                onChange={(e) => handleContactChange('name', e.target.value)}
                placeholder="John Smith"
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors',
                  t.inputBg,
                  t.inputFocus
                )}
                style={{ '--tw-ring-color': accent } as React.CSSProperties}
              />
            </div>

            {/* Phone */}
            <div>
              <label className={cn('flex items-center gap-1.5 text-sm font-medium mb-1.5', t.textSecondary)}>
                <Phone className="w-4 h-4" />
                Phone Number <span className="text-red-400">*</span>
              </label>
              <input
                type="tel"
                value={contactInfo.phone}
                onChange={(e) => handleContactChange('phone', e.target.value)}
                placeholder="(555) 123-4567"
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors',
                  t.inputBg,
                  t.inputFocus
                )}
                style={{ '--tw-ring-color': accent } as React.CSSProperties}
              />
            </div>

            {/* Email (optional) */}
            <div>
              <label className={cn('flex items-center gap-1.5 text-sm font-medium mb-1.5', t.textSecondary)}>
                <Mail className="w-4 h-4" />
                Email <span className={t.textMuted}>(optional)</span>
              </label>
              <input
                type="email"
                value={contactInfo.email}
                onChange={(e) => handleContactChange('email', e.target.value)}
                placeholder="john@example.com"
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors',
                  t.inputBg,
                  t.inputFocus
                )}
                style={{ '--tw-ring-color': accent } as React.CSSProperties}
              />
            </div>

            {/* Description */}
            <div>
              <label className={cn('flex items-center gap-1.5 text-sm font-medium mb-1.5', t.textSecondary)}>
                <FileText className="w-4 h-4" />
                What do you need? <span className={t.textMuted}>(optional)</span>
              </label>
              <textarea
                value={contactInfo.description}
                onChange={(e) => handleContactChange('description', e.target.value)}
                placeholder="Describe the work needed..."
                rows={3}
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors resize-none',
                  t.inputBg,
                  t.inputFocus
                )}
                style={{ '--tw-ring-color': accent } as React.CSSProperties}
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!isContactValid || submitting}
              className={cn(
                'w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
              style={{
                backgroundColor: isContactValid && !submitting ? accent : undefined,
                color: isContactValid && !submitting ? '#000' : undefined,
              }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Booking...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Confirm Booking
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

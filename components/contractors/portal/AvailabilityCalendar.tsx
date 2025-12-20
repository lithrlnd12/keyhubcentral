'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { useAvailability } from '@/lib/hooks/useAvailability';
import { AvailabilityStatus, getAvailabilityInfo, formatDateKey } from '@/types/availability';

interface AvailabilityCalendarProps {
  contractorId: string;
}

const statusOptions = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'on_leave', label: 'On Leave' },
];

export function AvailabilityCalendar({ contractorId }: AvailabilityCalendarProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus>('available');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const { availability, loading, error, setDayStatus, clearDay } = useAvailability({
    contractorId,
    year,
    month,
  });

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    const key = formatDateKey(date);
    const existing = availability.get(key);
    if (existing) {
      setSelectedStatus(existing.status);
      setNotes(existing.notes || '');
    } else {
      setSelectedStatus('available');
      setNotes('');
    }
  };

  const handleSave = async () => {
    if (!selectedDate) return;

    setSaving(true);
    try {
      await setDayStatus(selectedDate, selectedStatus, notes || undefined);
      setSelectedDate(null);
      setNotes('');
    } catch (err) {
      console.error('Error saving availability:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!selectedDate) return;

    setSaving(true);
    try {
      await clearDay(selectedDate);
      setSelectedDate(null);
      setNotes('');
    } catch (err) {
      console.error('Error clearing availability:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <CalendarGrid
          year={year}
          month={month}
          availability={availability}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedDate
                ? selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Select a Date'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDate ? (
              <>
                <Select
                  label="Status"
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(e.target.value as AvailabilityStatus)
                  }
                  options={statusOptions}
                />

                <Textarea
                  label="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes..."
                  rows={3}
                />

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleClear}
                    disabled={saving}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">
                Click on a date to set your availability for that day.
              </p>
            )}

            <div className="pt-4 border-t border-gray-800">
              <h4 className="text-sm font-medium text-gray-300 mb-3">
                Quick Tips
              </h4>
              <ul className="text-xs text-gray-500 space-y-2">
                <li>• Set dates as Available when you can take jobs</li>
                <li>• Mark Busy when working on existing projects</li>
                <li>• Use On Leave for vacations or time off</li>
                <li>• Unavailable means you cannot be scheduled</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Contractor } from '@/types/contractor';
import {
  Availability,
  AvailabilityStatus,
  getAvailabilityInfo,
  formatDateKey,
} from '@/types/availability';
import { subscribeToMonthAvailability, setAvailability, clearAvailability } from '@/lib/firebase/availability';

interface AvailabilityCardContentProps {
  contractor: Contractor;
}

const DAYS_OF_WEEK = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_OPTIONS: AvailabilityStatus[] = ['available', 'busy', 'unavailable', 'on_leave'];

export function AvailabilityCardContent({ contractor }: AvailabilityCardContentProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailabilityState] = useState<Map<string, Availability>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [year, month]);

  useEffect(() => {
    const unsubscribe = subscribeToMonthAvailability(
      contractor.id,
      year,
      month,
      (availabilityMap) => {
        setAvailabilityState(availabilityMap);
      }
    );

    return () => unsubscribe();
  }, [contractor.id, year, month]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const handleDayClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return;

    setSelectedDate(selectedDate?.toDateString() === date.toDateString() ? null : date);
  };

  const handleStatusSelect = async (status: AvailabilityStatus | 'clear') => {
    if (!selectedDate) return;

    setSaving(true);
    try {
      if (status === 'clear') {
        await clearAvailability(contractor.id, selectedDate);
      } else {
        await setAvailability(contractor.id, selectedDate, status);
      }
      setSelectedDate(null);
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const getStatusForDay = (date: Date): AvailabilityStatus | null => {
    const dateKey = formatDateKey(date);
    const dayAvailability = availability.get(dateKey);
    return dayAvailability?.status || null;
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isSelected = (date: Date | null): boolean => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold text-white">
          {MONTHS[month]} {year}
        </h3>
        <Button variant="ghost" size="sm" onClick={goToNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Compact Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500/30" />
          <span className="text-gray-400">Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-yellow-500/30" />
          <span className="text-gray-400">Busy</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500/30" />
          <span className="text-gray-400">Unavailable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-purple-500/30" />
          <span className="text-gray-400">Leave</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {DAYS_OF_WEEK.map((day, i) => (
          <div
            key={i}
            className="text-center text-xs font-medium text-gray-500 py-1"
          >
            {day}
          </div>
        ))}

        {calendarDays.map((day, index) => {
          if (!day) {
            return <div key={index} className="aspect-square" />;
          }

          const status = getStatusForDay(day);
          const statusInfo = status ? getAvailabilityInfo(status) : null;
          const past = isPast(day);
          const today = isToday(day);
          const selected = isSelected(day);

          return (
            <button
              key={index}
              onClick={() => handleDayClick(day)}
              disabled={past}
              className={`
                aspect-square rounded text-xs flex items-center justify-center
                transition-all
                ${past ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:ring-1 hover:ring-gold/50'}
                ${selected ? 'ring-2 ring-gold' : ''}
                ${today ? 'font-bold' : ''}
                ${status ? statusInfo?.bgColor : 'bg-green-500/20'}
              `}
            >
              <span className={`${today ? 'text-gold' : status ? statusInfo?.color : 'text-green-400'}`}>
                {day.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Status Selector */}
      {selectedDate && (
        <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
          <p className="text-xs text-gray-400">
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </p>
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((status) => {
              const info = getAvailabilityInfo(status);
              const currentStatus = getStatusForDay(selectedDate);
              const isActive = currentStatus === status;

              return (
                <button
                  key={status}
                  onClick={() => handleStatusSelect(status)}
                  disabled={saving}
                  className={`
                    px-3 py-1.5 rounded text-xs transition-all
                    ${isActive ? 'ring-2 ring-gold' : ''}
                    ${info.bgColor} ${info.color}
                    ${saving ? 'opacity-50' : 'hover:opacity-80'}
                  `}
                >
                  {info.label}
                </button>
              );
            })}
            {getStatusForDay(selectedDate) && (
              <button
                onClick={() => handleStatusSelect('clear')}
                disabled={saving}
                className={`
                  px-3 py-1.5 rounded text-xs bg-gray-700 text-gray-300
                  ${saving ? 'opacity-50' : 'hover:bg-gray-600'}
                `}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      {!selectedDate && (
        <p className="text-xs text-gray-500 text-center">
          Tap a day to set your availability
        </p>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Contractor } from '@/types/contractor';
import {
  Availability,
  AvailabilityStatus,
  BlockStatus,
  TimeBlock,
  TIME_BLOCKS,
  TIME_BLOCK_CONFIG,
  getAvailabilityInfo,
  formatDateKey,
  getDefaultBlocks,
} from '@/types/availability';
import {
  subscribeToMonthAvailability,
  setAvailability,
  setBlockAvailability,
  clearAvailability,
} from '@/lib/firebase/availability';
import { AvailabilityLegend } from './AvailabilityLegend';

interface ContractorAvailabilityCalendarProps {
  contractor: Contractor;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const STATUS_OPTIONS: AvailabilityStatus[] = ['available', 'busy', 'unavailable', 'on_leave'];

export function ContractorAvailabilityCalendar({ contractor }: ContractorAvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [availability, setAvailabilityState] = useState<Map<string, Availability>>(new Map());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<TimeBlock | 'all'>('all');
  const [saving, setSaving] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Calendar days for current month
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

    // Pad to complete the last week
    while (days.length % 7 !== 0) {
      days.push(null);
    }

    return days;
  }, [year, month]);

  // Subscribe to availability changes
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

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(null);
  };

  const handleDayClick = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return; // Can't edit past dates

    setSelectedDate(date);
  };

  const handleStatusSelect = async (status: AvailabilityStatus | 'clear') => {
    if (!selectedDate) return;

    setSaving(true);
    try {
      if (status === 'clear') {
        await clearAvailability(contractor.id, selectedDate);
      } else if (selectedBlock === 'all') {
        // Set all blocks to the same status
        const blocks: BlockStatus = {
          am: status,
          pm: status,
          evening: status,
        };
        await setAvailability(contractor.id, selectedDate, blocks);
      } else {
        // Set a single block
        await setBlockAvailability(contractor.id, selectedDate, selectedBlock, status);
      }
      setSelectedDate(null);
      setSelectedBlock('all');
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const getBlocksForDay = (date: Date): BlockStatus | null => {
    const dateKey = formatDateKey(date);
    const dayAvailability = availability.get(dateKey);
    return dayAvailability?.blocks || null;
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
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-xl font-semibold text-white min-w-[200px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <Button variant="ghost" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>
      </Card>

      {/* Legend */}
      <AvailabilityLegend />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Calendar Grid */}
        <Card className="p-4 lg:col-span-2">
          <div className="grid grid-cols-7 gap-1">
            {/* Day headers */}
            {DAYS_OF_WEEK.map((day) => (
              <div
                key={day}
                className="text-center text-sm font-medium text-gray-400 py-2"
              >
                {day}
              </div>
            ))}

            {/* Calendar days */}
            {calendarDays.map((day, index) => {
              if (!day) {
                return <div key={index} className="aspect-square" />;
              }

              const blocks = getBlocksForDay(day);
              const displayBlocks = blocks || getDefaultBlocks();
              const past = isPast(day);
              const today = isToday(day);
              const selected = isSelected(day);

              return (
                <button
                  key={index}
                  onClick={() => handleDayClick(day)}
                  disabled={past}
                  className={`
                    aspect-square rounded-lg flex flex-col items-center justify-center
                    transition-all text-sm relative bg-gray-800/50
                    ${past ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:ring-2 hover:ring-gold/50'}
                    ${selected ? 'ring-2 ring-gold' : ''}
                    ${today ? 'font-bold' : ''}
                  `}
                >
                  <span className={`${today ? 'text-gold' : 'text-white'} mb-1`}>
                    {day.getDate()}
                  </span>
                  <div className="flex gap-0.5">
                    {TIME_BLOCKS.map((block) => {
                      const status = displayBlocks[block];
                      const info = getAvailabilityInfo(status);
                      return (
                        <div
                          key={block}
                          className={`w-2 h-2 rounded-sm ${info.bgColor}`}
                          title={`${TIME_BLOCK_CONFIG[block].shortLabel}: ${info.label}`}
                        />
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Status Selector */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Set Status</h3>

          {selectedDate ? (
            <div className="space-y-4">
              <p className="text-gray-400 text-sm">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              {/* Current Block Status */}
              {getBlocksForDay(selectedDate) && (
                <div className="bg-gray-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">Current</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {TIME_BLOCKS.map((block) => {
                      const blocks = getBlocksForDay(selectedDate);
                      const status = blocks?.[block] || 'available';
                      const info = getAvailabilityInfo(status);
                      return (
                        <div key={block} className="text-center">
                          <div className={`text-xs ${info.color} font-medium`}>
                            {TIME_BLOCK_CONFIG[block].shortLabel}
                          </div>
                          <div className={`w-4 h-4 mx-auto mt-1 rounded-full ${info.bgColor}`} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Time Block Selector */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Time Block</label>
                <div className="grid grid-cols-4 gap-1">
                  <button
                    onClick={() => setSelectedBlock('all')}
                    className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                      selectedBlock === 'all'
                        ? 'bg-gold/10 border border-gold text-gold'
                        : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
                    }`}
                  >
                    All
                  </button>
                  {TIME_BLOCKS.map((block) => (
                    <button
                      key={block}
                      onClick={() => setSelectedBlock(block)}
                      className={`px-2 py-1.5 rounded text-xs font-medium transition-all ${
                        selectedBlock === block
                          ? 'bg-gold/10 border border-gold text-gold'
                          : 'bg-gray-800 border border-gray-700 text-gray-300 hover:border-gray-600'
                      }`}
                    >
                      {TIME_BLOCK_CONFIG[block].shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status Options */}
              <div className="space-y-2">
                <label className="block text-sm text-gray-400">Status</label>
                {STATUS_OPTIONS.map((status) => {
                  const info = getAvailabilityInfo(status);
                  const blocks = getBlocksForDay(selectedDate);
                  const currentBlockStatus = selectedBlock === 'all'
                    ? (blocks?.am === blocks?.pm && blocks?.pm === blocks?.evening ? blocks?.am : null)
                    : blocks?.[selectedBlock];
                  const isActive = currentBlockStatus === status;

                  return (
                    <button
                      key={status}
                      onClick={() => handleStatusSelect(status)}
                      disabled={saving}
                      className={`
                        w-full p-3 rounded-lg border text-left transition-all
                        flex items-center gap-3
                        ${isActive ? 'border-gold bg-gold/10' : 'border-gray-700 hover:border-gray-600'}
                        ${saving ? 'opacity-50' : ''}
                      `}
                    >
                      <div className={`w-4 h-4 rounded-full ${info.bgColor}`} />
                      <span className={info.color}>{info.label}</span>
                    </button>
                  );
                })}

                {getBlocksForDay(selectedDate) && (
                  <button
                    onClick={() => handleStatusSelect('clear')}
                    disabled={saving}
                    className={`
                      w-full p-3 rounded-lg border border-gray-700
                      hover:border-gray-600 text-gray-400 text-left
                      ${saving ? 'opacity-50' : ''}
                    `}
                  >
                    Clear (Reset to Available)
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              Click on a day to set your availability
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

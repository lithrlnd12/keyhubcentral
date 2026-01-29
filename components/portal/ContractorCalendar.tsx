'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Contractor } from '@/types/contractor';
import { useContractorSchedule, ScheduleDay } from '@/lib/hooks/useContractorSchedule';
import {
  TIME_BLOCKS,
  TIME_BLOCK_CONFIG,
  getAvailabilityInfo,
  formatDateKey,
  getDefaultBlocks,
} from '@/types/availability';
import { CalendarDayDetail } from './CalendarDayDetail';

interface ContractorCalendarProps {
  contractor: Contractor;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function ContractorCalendar({ contractor }: ContractorCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const { days, loading, getScheduleDay, scheduledJobsCount } = useContractorSchedule({
    contractorId: contractor.id,
    year,
    month,
  });

  // Check if mobile on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 768);
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  });

  // Calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const daysArray: (Date | null)[] = [];

    for (let i = 0; i < startPadding; i++) {
      daysArray.push(null);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push(new Date(year, month, i));
    }

    while (daysArray.length % 7 !== 0) {
      daysArray.push(null);
    }

    return daysArray;
  }, [year, month]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date | null): boolean => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const selectedSchedule = selectedDate ? getScheduleDay(selectedDate) : null;

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <Button variant="ghost" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h2 className="text-lg sm:text-xl font-semibold text-white min-w-[140px] sm:min-w-[200px] text-center">
              {MONTHS[month]} {year}
            </h2>
            <Button variant="ghost" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {scheduledJobsCount > 0 && (
              <span className="hidden sm:flex items-center gap-1 text-sm text-gray-400">
                <Briefcase className="w-4 h-4" />
                {scheduledJobsCount} job{scheduledJobsCount !== 1 ? 's' : ''}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-5 h-3 rounded bg-brand-gold/30 border border-brand-gold/50" />
          <span>Has Jobs</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="flex gap-0.5">
            <div className="w-2 h-2 rounded-sm bg-green-500/20" />
            <div className="w-2 h-2 rounded-sm bg-yellow-500/20" />
            <div className="w-2 h-2 rounded-sm bg-red-500/20" />
          </div>
          <span>AM/PM/Eve Availability</span>
        </div>
      </div>

      {loading ? (
        <Card className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-brand-gold border-t-transparent rounded-full" />
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Calendar Grid */}
          <Card className="p-3 sm:p-4 lg:col-span-2">
            <div className="grid grid-cols-7 gap-1">
              {/* Day headers */}
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day}
                  className="text-center text-xs font-medium text-gray-400 py-2"
                >
                  {day}
                </div>
              ))}

              {/* Calendar days */}
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={index} className="aspect-square" />;
                }

                const schedule = getScheduleDay(day);
                const hasJobs = schedule.jobs.length > 0;
                const blocks = schedule.availability || getDefaultBlocks();
                const today = isToday(day);
                const selected = isSelected(day);

                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(day)}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center
                      transition-all text-sm relative
                      ${hasJobs ? 'bg-brand-gold/10 border border-brand-gold/30' : 'bg-gray-800/50'}
                      cursor-pointer hover:ring-2 hover:ring-brand-gold/50
                      ${selected ? 'ring-2 ring-brand-gold' : ''}
                      ${today ? 'font-bold' : ''}
                    `}
                  >
                    {/* Job count badge */}
                    {hasJobs && (
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-brand-gold text-black text-[10px] font-bold flex items-center justify-center">
                        {schedule.jobs.length}
                      </div>
                    )}

                    <span className={`${today ? 'text-brand-gold' : 'text-white'} mb-1`}>
                      {day.getDate()}
                    </span>

                    {/* Availability blocks */}
                    <div className="flex gap-0.5">
                      {TIME_BLOCKS.map((block) => {
                        const status = blocks[block];
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

          {/* Day Detail Panel - Desktop */}
          {selectedSchedule && !isMobile && (
            <CalendarDayDetail
              date={selectedDate!}
              jobs={selectedSchedule.jobs}
              availability={selectedSchedule.availability}
              onClose={() => setSelectedDate(null)}
            />
          )}

          {/* Empty state when no date selected - Desktop */}
          {!selectedSchedule && !isMobile && (
            <Card className="p-4 h-fit">
              <div className="text-center py-8 text-gray-500">
                <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a day to see details</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Day Detail - Mobile Bottom Sheet */}
      {selectedSchedule && isMobile && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedDate(null)}
          />
          <CalendarDayDetail
            date={selectedDate!}
            jobs={selectedSchedule.jobs}
            availability={selectedSchedule.availability}
            onClose={() => setSelectedDate(null)}
            isMobile
          />
        </>
      )}
    </div>
  );
}

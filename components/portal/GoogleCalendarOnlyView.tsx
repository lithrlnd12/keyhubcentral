'use client';

import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink, MapPin, Clock, Settings } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useGoogleCalendarEvents, getEventsForDate, GoogleCalendarEvent } from '@/lib/hooks/useGoogleCalendarEvents';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function GoogleCalendarOnlyView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Google Calendar events for the month
  const monthStart = useMemo(() => new Date(year, month, 1), [year, month]);
  const monthEnd = useMemo(() => new Date(year, month + 1, 0, 23, 59, 59), [year, month]);

  const {
    events: googleCalendarEvents,
    loading,
    error,
  } = useGoogleCalendarEvents({
    startDate: monthStart,
    endDate: monthEnd,
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

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelected = (date: Date | null): boolean => {
    if (!date || !selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const selectedEvents = selectedDate
    ? getEventsForDate(googleCalendarEvents, selectedDate).filter(e => !e.isKeyHubEvent)
    : [];

  // Check if calendar is connected
  const isCalendarConnected = googleCalendarEvents.length > 0 || (!loading && !error);

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
            <Link href="/portal/settings">
              <Button variant="ghost" size="sm" title="Calendar Settings">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-1">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <div className="w-5 h-3 rounded bg-blue-500/30 border border-blue-500/50" />
          <span>Google Calendar Event</span>
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

                const dayEvents = getEventsForDate(googleCalendarEvents, day).filter(e => !e.isKeyHubEvent);
                const hasEvents = dayEvents.length > 0;
                const today = isToday(day);
                const selected = isSelected(day);

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center
                      transition-all text-sm relative
                      ${hasEvents ? 'bg-blue-500/10 border border-blue-500/30' : 'bg-gray-800/50'}
                      cursor-pointer hover:ring-2 hover:ring-blue-500/50
                      ${selected ? 'ring-2 ring-blue-500' : ''}
                      ${today ? 'font-bold' : ''}
                    `}
                  >
                    {hasEvents && (
                      <div className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {dayEvents.length}
                      </div>
                    )}

                    <span className={`${today ? 'text-blue-400' : 'text-white'}`}>
                      {day.getDate()}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Day Detail Panel */}
          <Card className="p-4 h-fit">
            {selectedDate ? (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <CalendarDays className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-semibold text-white">
                    {selectedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h3>
                </div>

                {selectedEvents.length === 0 ? (
                  <div className="text-center py-6 text-gray-500">
                    <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No events scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedEvents.map((event) => (
                      <GoogleCalendarEventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Select a day to see events</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Connect Calendar Prompt */}
      {!loading && googleCalendarEvents.length === 0 && (
        <Card className="p-4">
          <div className="text-center py-4">
            <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400 mb-4">
              Connect your Google Calendar to see your events here
            </p>
            <Link href="/portal/settings">
              <Button>
                <Settings className="w-4 h-4 mr-2" />
                Go to Settings
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

// Google Calendar Event Card Component
function GoogleCalendarEventCard({ event }: { event: GoogleCalendarEvent }) {
  const formatTime = (dateStr: string, isAllDay: boolean) => {
    if (isAllDay) return 'All day';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white text-sm truncate">{event.summary}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(event.start, event.isAllDay)}
              {!event.isAllDay && ` - ${formatTime(event.end, event.isAllDay)}`}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-1 mt-1 text-xs text-gray-400">
              <MapPin className="w-3 h-3" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
        </div>
        {event.htmlLink && (
          <a
            href={event.htmlLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
            title="Open in Google Calendar"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}

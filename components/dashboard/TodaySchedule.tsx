'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Calendar, MapPin, Clock, Briefcase } from 'lucide-react';
import { useGoogleCalendarEvents, getEventsForDate, useJobs } from '@/lib/hooks';
import type { GoogleCalendarEvent } from '@/lib/hooks';
import type { Job } from '@/types/job';

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface ScheduleItem {
  id: string;
  title: string;
  time: string;
  type: 'event' | 'job';
  location?: string;
  href?: string;
  sortTime: number;
}

export function TodaySchedule() {
  const today = useMemo(() => new Date(), []);
  const endOfWeek = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + (7 - d.getDay()));
    return d;
  }, [today]);

  const { events, loading: eventsLoading } = useGoogleCalendarEvents({
    startDate: today,
    endDate: endOfWeek,
  });

  const { jobs, loading: jobsLoading } = useJobs({ realtime: true });

  const todayEvents = useMemo(() => getEventsForDate(events, today), [events, today]);

  const todayJobs = useMemo(() => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

    return jobs.filter((job) => {
      if (!job?.dates?.scheduledStart) return false;
      const start = job.dates.scheduledStart instanceof Date
        ? job.dates.scheduledStart
        : job.dates.scheduledStart?.toDate?.();
      return start && start >= todayStart && start < todayEnd;
    });
  }, [jobs, today]);

  const upcomingJobs = useMemo(() => {
    const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    return jobs.filter((job) => {
      if (!job?.dates?.scheduledStart) return false;
      const start = job.dates.scheduledStart instanceof Date
        ? job.dates.scheduledStart
        : job.dates.scheduledStart?.toDate?.();
      return start && start >= tomorrow && start <= endOfWeek;
    }).slice(0, 3);
  }, [jobs, today, endOfWeek]);

  const scheduleItems = useMemo<ScheduleItem[]>(() => {
    const items: ScheduleItem[] = [];

    todayEvents.forEach((event: GoogleCalendarEvent) => {
      items.push({
        id: `event-${event.id}`,
        title: event.summary,
        time: event.isAllDay ? 'All day' : formatTime(event.start),
        type: 'event',
        location: event.location,
        href: event.htmlLink,
        sortTime: event.isAllDay ? 0 : new Date(event.start).getTime(),
      });
    });

    todayJobs.forEach((job: Job) => {
      const start = job.dates?.scheduledStart instanceof Date
        ? job.dates.scheduledStart
        : job.dates?.scheduledStart?.toDate?.();
      items.push({
        id: `job-${job.id}`,
        title: `${job.type ? job.type.charAt(0).toUpperCase() + job.type.slice(1) : 'Job'} — ${job.customer?.name || 'Unknown'}`,
        time: start ? formatTime(start.toISOString()) : 'TBD',
        type: 'job',
        location: job.customer?.address?.city,
        href: `/kr/${job.id}`,
        sortTime: start ? start.getTime() : Infinity,
      });
    });

    items.sort((a, b) => a.sortTime - b.sortTime);
    return items;
  }, [todayEvents, todayJobs]);

  const loading = eventsLoading || jobsLoading;

  if (loading) {
    return (
      <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-4 h-4 text-brand-gold" />
          <h3 className="font-semibold text-white">Today&apos;s Schedule</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-800/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-charcoal rounded-xl border border-gray-800 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-gold" />
          <h3 className="font-semibold text-white">Today&apos;s Schedule</h3>
        </div>
        <Link href="/calendar" className="text-xs text-brand-gold hover:text-brand-gold-light">
          View calendar
        </Link>
      </div>

      {scheduleItems.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4">No events or jobs scheduled today.</p>
      ) : (
        <div className="space-y-2">
          {scheduleItems.map((item) => {
            const content = (
              <div className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-gray-800/50 transition-colors">
                <div className="p-1.5 bg-gray-800 rounded shrink-0 mt-0.5">
                  {item.type === 'job' ? (
                    <Briefcase className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{item.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                    {item.location && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {item.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );

            return item.href ? (
              <Link key={item.id} href={item.href}>{content}</Link>
            ) : (
              <div key={item.id}>{content}</div>
            );
          })}
        </div>
      )}

      {/* Upcoming this week */}
      {upcomingJobs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Coming up this week</p>
          <div className="space-y-1.5">
            {upcomingJobs.map((job) => {
              const start = job.dates?.scheduledStart instanceof Date
                ? job.dates.scheduledStart
                : job.dates?.scheduledStart?.toDate?.();
              const dayLabel = start
                ? start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                : 'TBD';
              return (
                <Link
                  key={job.id}
                  href={`/kr/${job.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-sm text-gray-300 truncate">
                    {job.customer?.name || 'Job'} — {job.type || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500 shrink-0 ml-2">{dayLabel}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

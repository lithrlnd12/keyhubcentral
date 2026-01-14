'use client';

import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Contractor } from '@/types/contractor';
import {
  Availability,
  AvailabilityStatus,
  BlockStatus,
  TIME_BLOCKS,
  TIME_BLOCK_CONFIG,
  getAvailabilityInfo,
  formatDateKey,
  getDayStatusFromBlocks,
  getDefaultBlocks,
} from '@/types/availability';
import { getContractors } from '@/lib/firebase/contractors';
import { getAllContractorsAvailability } from '@/lib/firebase/availability';
import { AvailabilityModal } from './AvailabilityModal';
import { AvailabilityLegend } from './AvailabilityLegend';

interface AvailabilityCalendarProps {
  contractorId?: string; // If provided, only show this contractor (for portal)
  canEdit?: boolean; // Can the user edit availability
  onlyShowContractorId?: string; // Filter to single contractor
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function AvailabilityCalendar({
  contractorId,
  canEdit = false,
  onlyShowContractorId
}: AvailabilityCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [availability, setAvailability] = useState<Map<string, Map<string, Availability>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedContractor, setSelectedContractor] = useState<Contractor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get calendar days for current month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();

    const days: (Date | null)[] = [];

    // Add padding for days before the first of the month
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [year, month]);

  // Load contractors and availability
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Get contractors
        let contractorList = await getContractors({ status: 'active' });

        // Filter to single contractor if specified
        if (onlyShowContractorId) {
          contractorList = contractorList.filter(c => c.id === onlyShowContractorId);
        }

        setContractors(contractorList);

        // Get availability for the month
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        const contractorIds = contractorList.map(c => c.id);

        if (contractorIds.length > 0) {
          const availabilityData = await getAllContractorsAvailability(
            contractorIds,
            startDate,
            endDate
          );
          setAvailability(availabilityData);
        }
      } catch (error) {
        console.error('Error loading availability:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [year, month, onlyShowContractorId]);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date, contractor: Contractor) => {
    if (!canEdit) return;
    setSelectedDate(date);
    setSelectedContractor(contractor);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
    setSelectedContractor(null);
  };

  const handleAvailabilityUpdate = async () => {
    // Refresh availability data
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0);
    const contractorIds = contractors.map(c => c.id);

    if (contractorIds.length > 0) {
      const availabilityData = await getAllContractorsAvailability(
        contractorIds,
        startDate,
        endDate
      );
      setAvailability(availabilityData);
    }
    handleModalClose();
  };

  const getBlocksForDay = (contractorId: string, date: Date): BlockStatus | null => {
    const contractorAvailability = availability.get(contractorId);
    if (!contractorAvailability) return null;

    const dateKey = formatDateKey(date);
    const dayAvailability = contractorAvailability.get(dateKey);
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

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
        </div>
      </Card>
    );
  }

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
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <AvailabilityLegend />

      {/* Calendar Grid */}
      <Card className="p-4 overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              <th className="text-left text-gray-400 font-medium py-2 px-3 w-48 border-b border-gray-700">
                Contractor
              </th>
              {calendarDays.map((day, index) => (
                <th
                  key={index}
                  className={`text-center text-xs py-2 px-1 border-b border-gray-700 min-w-[40px] ${
                    day ? (isToday(day) ? 'text-gold font-bold' : 'text-gray-400') : ''
                  }`}
                >
                  {day && (
                    <>
                      <div>{DAYS_OF_WEEK[day.getDay()]}</div>
                      <div className={isToday(day) ? 'text-gold' : ''}>{day.getDate()}</div>
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {contractors.map((contractor) => (
              <tr key={contractor.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                <td className="py-3 px-3">
                  <div className="text-white font-medium text-sm truncate">
                    {contractor.businessName || `${contractor.userId}`}
                  </div>
                  <div className="text-gray-500 text-xs truncate">
                    {contractor.trades?.join(', ')}
                  </div>
                </td>
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <td key={index} className="bg-gray-900/50"></td>;
                  }

                  const blocks = getBlocksForDay(contractor.id, day);
                  const defaultBlocks = getDefaultBlocks();
                  const displayBlocks = blocks || defaultBlocks;
                  const past = isPast(day);

                  return (
                    <td
                      key={index}
                      className={`text-center p-1 ${
                        past ? 'opacity-50' : ''
                      } ${canEdit && !past ? 'cursor-pointer hover:bg-gray-700/50' : ''}`}
                      onClick={() => !past && handleDayClick(day, contractor)}
                    >
                      <div
                        className="flex flex-col gap-0.5 mx-auto w-6"
                        title={TIME_BLOCKS.map(b =>
                          `${TIME_BLOCK_CONFIG[b].shortLabel}: ${getAvailabilityInfo(displayBlocks[b]).label}`
                        ).join('\n')}
                      >
                        {TIME_BLOCKS.map((block) => {
                          const status = displayBlocks[block];
                          const info = getAvailabilityInfo(status);
                          return (
                            <div
                              key={block}
                              className={`h-1.5 w-full rounded-sm ${info.bgColor}`}
                            />
                          );
                        })}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            {contractors.length === 0 && (
              <tr>
                <td colSpan={calendarDays.length + 1} className="py-8 text-center text-gray-500">
                  No active contractors found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Availability Modal */}
      {isModalOpen && selectedDate && selectedContractor && (
        <AvailabilityModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          onSave={handleAvailabilityUpdate}
          contractor={selectedContractor}
          date={selectedDate}
          currentBlocks={getBlocksForDay(selectedContractor.id, selectedDate)}
        />
      )}
    </div>
  );
}

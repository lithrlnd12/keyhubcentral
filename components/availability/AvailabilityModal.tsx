'use client';

import { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Contractor } from '@/types/contractor';
import { AvailabilityStatus, getAvailabilityInfo } from '@/types/availability';
import { setAvailability, clearAvailability, setAvailabilityBulk } from '@/lib/firebase/availability';

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  contractor: Contractor;
  date: Date;
  currentStatus: AvailabilityStatus | null;
}

const STATUS_OPTIONS: { value: AvailabilityStatus; label: string; description: string }[] = [
  { value: 'available', label: 'Available', description: 'Open for work' },
  { value: 'busy', label: 'Busy', description: 'Has scheduled work' },
  { value: 'unavailable', label: 'Unavailable', description: 'Cannot work this day' },
  { value: 'on_leave', label: 'On Leave', description: 'Vacation or time off' },
];

export function AvailabilityModal({
  isOpen,
  onClose,
  onSave,
  contractor,
  date,
  currentStatus,
}: AvailabilityModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus | 'clear'>(
    currentStatus || 'available'
  );
  const [notes, setNotes] = useState('');
  const [endDate, setEndDate] = useState<string>('');
  const [isRange, setIsRange] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const formatDisplayDate = (d: Date) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selectedStatus === 'clear') {
        await clearAvailability(contractor.id, date);
      } else if (isRange && endDate) {
        // Handle date range
        const end = new Date(endDate);
        const dates: Date[] = [];
        const current = new Date(date);

        while (current <= end) {
          dates.push(new Date(current));
          current.setDate(current.getDate() + 1);
        }

        await setAvailabilityBulk(contractor.id, dates, selectedStatus, notes || undefined);
      } else {
        await setAvailability(contractor.id, date, selectedStatus, notes || undefined);
      }
      onSave();
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 border border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Set Availability</h2>
            <p className="text-sm text-gray-400 mt-1">
              {contractor.businessName || 'Contractor'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Date Display */}
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar className="h-5 w-5 text-gold" />
            <span>{formatDisplayDate(date)}</span>
          </div>

          {/* Date Range Toggle */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isRange}
                onChange={(e) => setIsRange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-gold focus:ring-gold"
              />
              <span className="text-sm text-gray-300">Apply to date range</span>
            </label>
          </div>

          {isRange && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={date.toISOString().split('T')[0]}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          )}

          {/* Status Options */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">Status</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((option) => {
                const info = getAvailabilityInfo(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => setSelectedStatus(option.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedStatus === option.value
                        ? 'border-gold bg-gold/10'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${info.bgColor}`} />
                      <span className={`text-sm font-medium ${info.color}`}>
                        {option.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clear option */}
          {currentStatus && (
            <button
              onClick={() => setSelectedStatus('clear')}
              className={`w-full p-3 rounded-lg border text-left transition-all ${
                selectedStatus === 'clear'
                  ? 'border-gold bg-gold/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <span className="text-sm font-medium text-gray-300">
                Clear (Reset to Available)
              </span>
            </button>
          )}

          {/* Notes */}
          {selectedStatus !== 'clear' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Notes (optional)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this availability..."
                rows={2}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>
    </div>
  );
}

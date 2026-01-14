'use client';

import { useState } from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Contractor } from '@/types/contractor';
import {
  AvailabilityStatus,
  BlockStatus,
  TimeBlock,
  TIME_BLOCK_CONFIG,
  TIME_BLOCKS,
  getAvailabilityInfo,
  getDefaultBlocks,
} from '@/types/availability';
import {
  setAvailability,
  setBlockAvailability,
  clearAvailability,
  setAvailabilityBulk,
  setAvailabilityBulkBlocks,
} from '@/lib/firebase/availability';

type BlockSelection = TimeBlock | 'all';

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  contractor: Contractor;
  date: Date;
  currentBlocks?: BlockStatus | null;
}

const STATUS_OPTIONS: { value: AvailabilityStatus; label: string; description: string }[] = [
  { value: 'available', label: 'Available', description: 'Open for work' },
  { value: 'busy', label: 'Busy', description: 'Has scheduled work' },
  { value: 'unavailable', label: 'Unavailable', description: 'Cannot work this day' },
  { value: 'on_leave', label: 'On Leave', description: 'Vacation or time off' },
];

const BLOCK_OPTIONS: { value: BlockSelection; label: string }[] = [
  { value: 'all', label: 'All Day' },
  { value: 'am', label: TIME_BLOCK_CONFIG.am.label },
  { value: 'pm', label: TIME_BLOCK_CONFIG.pm.label },
  { value: 'evening', label: TIME_BLOCK_CONFIG.evening.label },
];

export function AvailabilityModal({
  isOpen,
  onClose,
  onSave,
  contractor,
  date,
  currentBlocks,
}: AvailabilityModalProps) {
  const [selectedBlock, setSelectedBlock] = useState<BlockSelection>('all');
  const [selectedStatus, setSelectedStatus] = useState<AvailabilityStatus | 'clear'>('available');
  const [notes, setNotes] = useState('');
  const [endDate, setEndDate] = useState<string>('');
  const [isRange, setIsRange] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get current status based on selected block
  const getCurrentBlockStatus = (): AvailabilityStatus | null => {
    if (!currentBlocks) return null;
    if (selectedBlock === 'all') {
      // If all blocks are the same, return that status
      const { am, pm, evening } = currentBlocks;
      if (am === pm && pm === evening) return am;
      return null; // Mixed status
    }
    return currentBlocks[selectedBlock];
  };

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

        if (selectedBlock === 'all') {
          // Set all blocks to the same status for all dates
          await setAvailabilityBulk(contractor.id, dates, selectedStatus, notes || undefined);
        } else {
          // Set specific block for all dates
          const blockStatus: BlockStatus = currentBlocks || getDefaultBlocks();
          blockStatus[selectedBlock] = selectedStatus;
          await setAvailabilityBulkBlocks(contractor.id, dates, blockStatus, notes || undefined);
        }
      } else {
        if (selectedBlock === 'all') {
          // Set all blocks to the same status
          const blocks: BlockStatus = {
            am: selectedStatus,
            pm: selectedStatus,
            evening: selectedStatus,
          };
          await setAvailability(contractor.id, date, blocks, notes || undefined);
        } else {
          // Set a single block
          await setBlockAvailability(contractor.id, date, selectedBlock, selectedStatus);
        }
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

          {/* Current Block Status Display */}
          {currentBlocks && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-400">Current Status</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {TIME_BLOCKS.map((block) => {
                  const config = TIME_BLOCK_CONFIG[block];
                  const status = currentBlocks[block];
                  const info = getAvailabilityInfo(status);
                  return (
                    <div key={block} className="text-center">
                      <div className={`text-xs ${info.color} font-medium`}>
                        {config.shortLabel}
                      </div>
                      <div className={`w-4 h-4 mx-auto mt-1 rounded-full ${info.bgColor}`} />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time Block Selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-400">Time Block</label>
            <div className="grid grid-cols-4 gap-2">
              {BLOCK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedBlock(option.value)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    selectedBlock === option.value
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-gray-700 hover:border-gray-600 text-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
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
          {currentBlocks && (
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

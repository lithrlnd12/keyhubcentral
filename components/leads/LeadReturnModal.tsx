'use client';

import { useState } from 'react';
import { Lead } from '@/types/lead';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { returnLead } from '@/lib/firebase/leads';
import { RotateCcw, X } from 'lucide-react';

interface LeadReturnModalProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onReturned?: () => void;
}

const RETURN_REASONS = [
  'Wrong contact information',
  'Outside service area',
  'Not a real inquiry',
  'Duplicate lead',
  'Customer not interested',
  'Other',
];

export function LeadReturnModal({
  lead,
  isOpen,
  onClose,
  onReturned,
}: LeadReturnModalProps) {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleReturn = async () => {
    const finalReason = reason === 'Other' ? customReason : reason;

    if (!finalReason.trim()) {
      setError('Please select or enter a reason');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await returnLead(lead.id, finalReason);
      onReturned?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to return lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-yellow-400" />
            Return Lead
          </CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lead Info */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-white font-medium">{lead.customer.name}</p>
            <p className="text-sm text-gray-400">
              {lead.trade} • {lead.customer.address.city}
            </p>
          </div>

          {/* Return Policy Notice */}
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              Lead returns must be submitted within 24 hours. A replacement lead will
              be provided within 48 hours.
            </p>
          </div>

          {/* Reason Selection */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Return Reason</label>
            <div className="space-y-2">
              {RETURN_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    reason === r
                      ? 'bg-brand-gold/20 border-brand-gold'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      reason === r
                        ? 'border-brand-gold bg-brand-gold'
                        : 'border-gray-500'
                    }`}
                  >
                    {reason === r && <div className="w-2 h-2 rounded-full bg-black" />}
                  </div>
                  <span className={reason === r ? 'text-white' : 'text-gray-400'}>
                    {r}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Reason */}
          {reason === 'Other' && (
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">
                Describe the reason
              </label>
              <textarea
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Please provide details..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50 resize-none"
                rows={3}
              />
            </div>
          )}

          {/* Error */}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReturn}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black"
              disabled={loading}
            >
              {loading ? 'Returning...' : 'Return Lead'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

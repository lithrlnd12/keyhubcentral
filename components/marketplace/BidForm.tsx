'use client';

import { useState } from 'react';
import { DollarSign, MapPin } from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  MarketplaceListing,
  PAY_TYPE_LABELS,
  TIME_BLOCK_LABELS,
} from '@/types/marketplace';
import { placeBid } from '@/lib/firebase/marketplace';
import { formatCurrency } from '@/lib/utils/formatters';

interface BidFormProps {
  listing: MarketplaceListing;
  contractorId: string;
  contractorName: string;
  contractorRating: number;
  contractorTier: string;
  distance?: number | null;
  onSubmit: () => void;
  onCancel?: () => void;
}

export function BidForm({
  listing,
  contractorId,
  contractorName,
  contractorRating,
  contractorTier,
  distance,
  onSubmit,
  onCancel,
}: BidFormProps) {
  const { t } = useTranslation();
  const [proposedRate, setProposedRate] = useState(listing.payRate);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (proposedRate <= 0) {
      setError(t('Please enter a valid rate.'));
      return;
    }

    if (!message.trim()) {
      setError(t('Please include a message with your bid.'));
      return;
    }

    setSubmitting(true);
    try {
      await placeBid(listing.id, {
        contractorId,
        contractorName,
        contractorRating,
        contractorTier,
        distance: distance ?? 0,
        proposedRate,
        message: message.trim(),
      });
      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('Failed to submit bid'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-white mb-1">{t('Place a Bid')}</h3>
      <p className="text-sm text-gray-400 mb-4">
        {listing.title} &mdash; {listing.location.city}, {listing.location.state}
      </p>

      {/* Listing summary */}
      <div className="bg-gray-800/50 rounded-lg p-3 mb-4 space-y-1 text-sm">
        <div className="flex justify-between text-gray-400">
          <span>{t('Listed Rate')}</span>
          <span className="text-green-400 font-medium">
            {formatCurrency(listing.payRate)}{PAY_TYPE_LABELS[listing.payType]}
          </span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>{t('Date Needed')}</span>
          <span className="text-white">{new Date(listing.dateNeeded).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>{t('Time')}</span>
          <span className="text-white">{TIME_BLOCK_LABELS[listing.timeBlock]}</span>
        </div>
        <div className="flex justify-between text-gray-400">
          <span>{t('Duration')}</span>
          <span className="text-white">{listing.estimatedDuration}</span>
        </div>
        {distance !== null && distance !== undefined && (
          <div className="flex items-center justify-between text-gray-400">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {t('Distance')}
            </span>
            <span className="text-white">{distance.toFixed(1)} mi</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">
            {t('Your Proposed Rate')} ({listing.payType})
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="number"
              min={0}
              step={0.01}
              value={proposedRate}
              onChange={(e) => setProposedRate(Number(e.target.value))}
              className="w-full pl-9 pr-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
            />
          </div>
        </div>

        <Textarea
          label={t('Message')}
          placeholder={t('Introduce yourself, highlight relevant experience, and explain why you\'re the right fit...')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
        />

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <div className="flex gap-3">
          <Button type="submit" loading={submitting} className="flex-1">
            {t('Submit Bid')}
          </Button>
          {onCancel && (
            <Button type="button" variant="secondary" onClick={onCancel}>
              {t('Cancel')}
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}

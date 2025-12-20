'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Campaign, CampaignPlatform } from '@/types/lead';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { createCampaign, updateCampaign } from '@/lib/firebase/campaigns';
import { CAMPAIGN_PLATFORM_LABELS } from '@/lib/utils/campaigns';
import { LEAD_TRADES, LEAD_MARKETS } from '@/lib/utils/leads';
import { Megaphone, Save, ArrowLeft } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

interface CampaignFormProps {
  campaign?: Campaign;
  mode: 'create' | 'edit';
}

const PLATFORM_OPTIONS: CampaignPlatform[] = [
  'google_ads',
  'meta',
  'tiktok',
  'event',
  'other',
];

export function CampaignForm({ campaign, mode }: CampaignFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatDateForInput = (timestamp: Timestamp | null | undefined): string => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    name: campaign?.name || '',
    platform: campaign?.platform || ('google_ads' as CampaignPlatform),
    market: campaign?.market || '',
    trade: campaign?.trade || '',
    startDate: formatDateForInput(campaign?.startDate),
    endDate: formatDateForInput(campaign?.endDate),
    spend: campaign?.spend?.toString() || '0',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setError('Campaign name is required');
      return;
    }
    if (!formData.startDate) {
      setError('Start date is required');
      return;
    }
    if (!formData.trade) {
      setError('Trade is required');
      return;
    }
    if (!formData.market) {
      setError('Market is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const campaignData = {
        name: formData.name,
        platform: formData.platform,
        market: formData.market,
        trade: formData.trade,
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: formData.endDate ? Timestamp.fromDate(new Date(formData.endDate)) : null,
        spend: parseFloat(formData.spend) || 0,
        leadsGenerated: campaign?.leadsGenerated || 0,
      };

      if (mode === 'create') {
        const id = await createCampaign(campaignData);
        router.push(`/kd/campaigns/${id}`);
      } else if (campaign) {
        await updateCampaign(campaign.id, campaignData);
        router.push(`/kd/campaigns/${campaign.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={mode === 'edit' && campaign ? `/kd/campaigns/${campaign.id}` : '/kd/campaigns'}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {mode === 'create' ? 'Create Campaign' : 'Edit Campaign'}
          </h1>
        </div>
        <Button type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Campaign'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-brand-gold" />
            Campaign Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1.5">
              Campaign Name <span className="text-red-400">*</span>
            </label>
            <Input
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Q1 2025 Google Ads - Bathroom"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Platform <span className="text-red-400">*</span>
              </label>
              <select
                name="platform"
                value={formData.platform}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
              >
                {PLATFORM_OPTIONS.map((platform) => (
                  <option key={platform} value={platform}>
                    {CAMPAIGN_PLATFORM_LABELS[platform]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Trade <span className="text-red-400">*</span>
              </label>
              <select
                name="trade"
                value={formData.trade}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
                required
              >
                <option value="">Select trade...</option>
                {LEAD_TRADES.map((trade) => (
                  <option key={trade} value={trade}>
                    {trade}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Market <span className="text-red-400">*</span>
              </label>
              <select
                name="market"
                value={formData.market}
                onChange={handleChange}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
                required
              >
                <option value="">Select market...</option>
                {LEAD_MARKETS.map((market) => (
                  <option key={market} value={market}>
                    {market}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Ad Spend
              </label>
              <Input
                name="spend"
                type="number"
                min="0"
                step="0.01"
                value={formData.spend}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Start Date <span className="text-red-400">*</span>
              </label>
              <Input
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                End Date (optional)
              </label>
              <Input
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}

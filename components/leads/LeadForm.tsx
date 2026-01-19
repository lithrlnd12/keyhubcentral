'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead, LeadSource, LeadQuality } from '@/types/lead';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { createLead, updateLead } from '@/lib/firebase/leads';
import {
  LEAD_SOURCE_LABELS,
  LEAD_QUALITY_LABELS,
  LEAD_TRADES,
  LEAD_MARKETS,
} from '@/lib/utils/leads';
import { User, MapPin, Wrench, Save, ArrowLeft, MessageSquare } from 'lucide-react';
import Link from 'next/link';

interface LeadFormProps {
  lead?: Lead;
  mode: 'create' | 'edit';
}

const SOURCE_OPTIONS: LeadSource[] = [
  'google_ads',
  'meta',
  'tiktok',
  'event',
  'referral',
  'other',
];

const QUALITY_OPTIONS: LeadQuality[] = ['hot', 'warm', 'cold'];

export function LeadForm({ lead, mode }: LeadFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    customerName: lead?.customer.name || '',
    customerEmail: lead?.customer.email || '',
    customerPhone: lead?.customer.phone || '',
    street: lead?.customer.address.street || '',
    city: lead?.customer.address.city || '',
    state: lead?.customer.address.state || '',
    zip: lead?.customer.address.zip || '',
    notes: lead?.customer.notes || '',
    source: lead?.source || ('google_ads' as LeadSource),
    quality: lead?.quality || ('warm' as LeadQuality),
    trade: lead?.trade || '',
    market: lead?.market || '',
    campaignId: lead?.campaignId || '',
    smsCallOptIn: lead?.smsCallOptIn || false,
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.customerName.trim()) {
      setError('Customer name is required');
      return;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return;
    }
    if (!formData.state.trim()) {
      setError('State is required');
      return;
    }
    if (!formData.trade) {
      setError('Trade is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const leadData = {
        customer: {
          name: formData.customerName,
          email: formData.customerEmail || null,
          phone: formData.customerPhone || null,
          address: {
            street: formData.street || '',
            city: formData.city,
            state: formData.state,
            zip: formData.zip || '',
          },
          notes: formData.notes || null,
        },
        source: formData.source,
        quality: formData.quality,
        trade: formData.trade,
        market: formData.market || '',
        campaignId: formData.campaignId || null,
        status: 'new' as const,
        assignedTo: null,
        assignedType: null,
        returnReason: null,
        returnedAt: null,
        smsCallOptIn: formData.smsCallOptIn,
      };

      if (mode === 'create') {
        const id = await createLead(leadData);
        router.push(`/kd/leads/${id}`);
      } else if (lead) {
        await updateLead(lead.id, {
          customer: leadData.customer,
          source: leadData.source,
          quality: leadData.quality,
          trade: leadData.trade,
          market: leadData.market,
          campaignId: leadData.campaignId,
          smsCallOptIn: formData.smsCallOptIn,
          // Flag to indicate if this is a new opt-in (timestamp will be set in updateLead)
          _newSmsOptIn: formData.smsCallOptIn && !lead.smsCallOptIn,
        });
        router.push(`/kd/leads/${lead.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lead');
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
            href={mode === 'edit' && lead ? `/kd/leads/${lead.id}` : '/kd'}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="text-2xl font-bold text-white">
            {mode === 'create' ? 'Add New Lead' : 'Edit Lead'}
          </h1>
        </div>
        <Button type="submit" disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Lead'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-brand-gold" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                placeholder="Customer name"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email</label>
              <Input
                name="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={handleChange}
                placeholder="customer@email.com"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Phone</label>
              <Input
                name="customerPhone"
                type="tel"
                value={formData.customerPhone}
                onChange={handleChange}
                placeholder="(555) 555-5555"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes about this lead..."
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold/50 resize-none"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand-gold" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Street</label>
              <Input
                name="street"
                value={formData.street}
                onChange={handleChange}
                placeholder="123 Main St"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  City <span className="text-red-400">*</span>
                </label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="City"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  State <span className="text-red-400">*</span>
                </label>
                <Input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  placeholder="TX"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">ZIP Code</label>
              <Input
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                placeholder="75001"
              />
            </div>
          </CardContent>
        </Card>

        {/* Lead Details */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-brand-gold" />
              Lead Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Source <span className="text-red-400">*</span>
                </label>
                <select
                  name="source"
                  value={formData.source}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
                >
                  {SOURCE_OPTIONS.map((source) => (
                    <option key={source} value={source}>
                      {LEAD_SOURCE_LABELS[source]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">
                  Quality <span className="text-red-400">*</span>
                </label>
                <select
                  name="quality"
                  value={formData.quality}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
                >
                  {QUALITY_OPTIONS.map((quality) => (
                    <option key={quality} value={quality}>
                      {LEAD_QUALITY_LABELS[quality]}
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

              <div>
                <label className="block text-sm text-gray-400 mb-1.5">Market</label>
                <select
                  name="market"
                  value={formData.market}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-brand-gold/50"
                >
                  <option value="">Select market...</option>
                  {LEAD_MARKETS.map((market) => (
                    <option key={market} value={market}>
                      {market}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-1.5">
                Campaign ID (optional)
              </label>
              <Input
                name="campaignId"
                value={formData.campaignId}
                onChange={handleChange}
                placeholder="Link to campaign..."
              />
            </div>
          </CardContent>
        </Card>

        {/* SMS/Call Consent - TCPA/CTIA Compliance */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-gold" />
              Communication Consent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="smsCallOptIn"
                name="smsCallOptIn"
                checked={formData.smsCallOptIn}
                onChange={handleChange}
                className="mt-1 h-5 w-5 rounded border-gray-600 bg-gray-800 text-brand-gold focus:ring-brand-gold/50 focus:ring-offset-gray-900 cursor-pointer"
              />
              <label htmlFor="smsCallOptIn" className="text-sm text-gray-300 cursor-pointer">
                By checking this box, the customer agrees to receive calls and text messages from KeyHub and its affiliates at the phone number provided.
                Message frequency varies. Message and data rates may apply.
                Reply STOP to unsubscribe or HELP for help.
                Consent is not a condition of purchase.{' '}
                <Link
                  href="/legal/sms-terms"
                  target="_blank"
                  className="text-brand-gold hover:text-brand-gold/80 underline"
                >
                  View SMS Terms & Conditions
                </Link>
              </label>
            </div>
            {lead?.smsCallOptIn && lead?.smsCallOptInAt && (
              <p className="mt-3 text-xs text-gray-500">
                Consent recorded on {lead.smsCallOptInAt.toDate().toLocaleDateString()} at {lead.smsCallOptInAt.toDate().toLocaleTimeString()}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

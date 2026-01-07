'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Building2, Save } from 'lucide-react';
import { createPartner } from '@/lib/firebase/partners';
import { Spinner } from '@/components/ui/Spinner';

interface FormData {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  notes: string;
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

export default function NewPartnerPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    notes: '',
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (!formData.contactName.trim()) {
      setError('Contact name is required');
      return;
    }
    if (!formData.contactEmail.trim()) {
      setError('Contact email is required');
      return;
    }
    if (!formData.contactPhone.trim()) {
      setError('Contact phone is required');
      return;
    }

    setSaving(true);

    try {
      await createPartner({
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        address: {
          street: formData.street.trim(),
          city: formData.city.trim(),
          state: formData.state,
          zip: formData.zip.trim(),
        },
        notes: formData.notes.trim() || null,
        status: 'pending',
      });

      router.push('/admin/partners');
    } catch (err) {
      console.error('Failed to create partner:', err);
      setError('Failed to create partner. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/partners"
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-400" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Add Partner</h1>
          <p className="text-gray-400">Create a new partner company</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Info */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gold/10 rounded-lg">
              <Building2 className="h-5 w-5 text-gold" />
            </div>
            <h2 className="text-lg font-semibold text-white">Company Information</h2>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Company Name *
            </label>
            <input
              type="text"
              name="companyName"
              value={formData.companyName}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              placeholder="Enter company name"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contact Name *
              </label>
              <input
                type="text"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                placeholder="Primary contact"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contact Phone *
              </label>
              <input
                type="tel"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Contact Email *
            </label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              placeholder="contact@company.com"
            />
          </div>
        </div>

        {/* Address */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Address</h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Street Address
            </label>
            <input
              type="text"
              name="street"
              value={formData.street}
              onChange={handleChange}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                placeholder="City"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                State
              </label>
              <select
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              >
                <option value="">Select</option>
                {US_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                ZIP Code
              </label>
              <input
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                placeholder="12345"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Notes</h2>

          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
            placeholder="Additional notes about this partner..."
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/admin/partners"
            className="flex-1 px-4 py-3 text-center border border-gray-800 rounded-lg text-white font-medium hover:bg-gray-900 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
          >
            {saving ? (
              <Spinner size="sm" />
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Partner
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

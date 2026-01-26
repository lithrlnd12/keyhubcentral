'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Building2 } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuth, usePartners } from '@/lib/hooks';
import { createLaborRequest } from '@/lib/firebase/laborRequests';
import { WorkType, WORK_TYPE_OPTIONS } from '@/types/partner';
import { Address } from '@/types/contractor';
import { Spinner } from '@/components/ui/Spinner';

export default function AdminNewLaborRequestPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { partners, loading: partnersLoading } = usePartners({
    initialFilters: { status: 'active' },
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    partnerId: '',
    workType: 'installation' as WorkType,
    description: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    dateNeeded: '',
    estimatedDuration: '',
    crewSize: 1,
    skillsRequired: '',
    specialEquipment: '',
    notes: '',
  });

  const selectedPartner = partners.find((p) => p.id === formData.partnerId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setError('User not authenticated');
      return;
    }

    if (!formData.partnerId || !selectedPartner) {
      setError('Please select a partner');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const location: Address = {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
      };

      await createLaborRequest({
        partnerId: formData.partnerId,
        partnerCompany: selectedPartner.companyName,
        submittedBy: user.uid,
        workType: formData.workType,
        description: formData.description,
        location,
        dateNeeded: Timestamp.fromDate(new Date(formData.dateNeeded)),
        estimatedDuration: formData.estimatedDuration,
        crewSize: formData.crewSize,
        skillsRequired: formData.skillsRequired
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        specialEquipment: formData.specialEquipment || null,
        notes: formData.notes || null,
      });

      router.push('/admin/partner-requests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  if (partnersLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/partner-requests"
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Labor Request</h1>
          <p className="text-gray-400">Create a labor request on behalf of a partner</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
            {error}
          </div>
        )}

        {/* Partner Selection */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gold" />
            Partner
          </h2>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Select Partner *</label>
            <select
              value={formData.partnerId}
              onChange={(e) => setFormData({ ...formData, partnerId: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              required
            >
              <option value="">Choose a partner...</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.companyName}
                </option>
              ))}
            </select>
            {partners.length === 0 && (
              <p className="mt-2 text-sm text-yellow-400">
                No active partners found. Please add a partner first.
              </p>
            )}
          </div>
        </div>

        {/* Work Type */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Work Details</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Work Type *</label>
            <select
              value={formData.workType}
              onChange={(e) => setFormData({ ...formData, workType: e.target.value as WorkType })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              required
            >
              {WORK_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the work to be done..."
              rows={4}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
              required
            />
          </div>
        </div>

        {/* Location */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Location</h2>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Street Address *</label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              placeholder="123 Main St"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">City *</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">State *</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                required
              />
            </div>
          </div>

          <div className="w-1/2">
            <label className="block text-sm text-gray-400 mb-2">ZIP Code *</label>
            <input
              type="text"
              value={formData.zip}
              onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              placeholder="12345"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
              required
            />
          </div>
        </div>

        {/* Scheduling & Crew */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Scheduling & Crew</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Date Needed *</label>
              <input
                type="date"
                value={formData.dateNeeded}
                onChange={(e) => setFormData({ ...formData, dateNeeded: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Estimated Duration *</label>
              <input
                type="text"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData({ ...formData, estimatedDuration: e.target.value })}
                placeholder="e.g., 2-3 days"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Crew Size *</label>
            <input
              type="number"
              value={formData.crewSize}
              onChange={(e) => setFormData({ ...formData, crewSize: parseInt(e.target.value) || 1 })}
              min={1}
              max={20}
              className="w-32 px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Skills Required</label>
            <input
              type="text"
              value={formData.skillsRequired}
              onChange={(e) => setFormData({ ...formData, skillsRequired: e.target.value })}
              placeholder="e.g., Plumbing, Electrical (comma separated)"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Special Equipment Needed</label>
            <input
              type="text"
              value={formData.specialEquipment}
              onChange={(e) => setFormData({ ...formData, specialEquipment: e.target.value })}
              placeholder="Any special tools or equipment"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        {/* Additional Notes */}
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Additional Notes</h2>

          <div>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Any additional information..."
              rows={3}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <Link
            href="/admin/partner-requests"
            className="flex-1 px-4 py-3 border border-gray-800 rounded-lg text-white text-center hover:bg-gray-900 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || partners.length === 0}
            className="flex-1 px-4 py-3 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Create Request'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  Pencil,
  Trash2,
  Save,
} from 'lucide-react';
import { subscribeToPartner, updatePartner, approvePartner, updatePartnerStatus, deletePartner } from '@/lib/firebase/partners';
import { Partner, PartnerStatus } from '@/types/partner';
import { useAuth } from '@/lib/hooks';
import { Spinner } from '@/components/ui/Spinner';

const STATUS_COLORS: Record<PartnerStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  active: 'bg-green-500/20 text-green-400',
  inactive: 'bg-gray-500/20 text-gray-400',
  suspended: 'bg-red-500/20 text-red-400',
};

export default function PartnerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const partnerId = params.id as string;

  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
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

  useEffect(() => {
    const unsubscribe = subscribeToPartner(partnerId, (data) => {
      setPartner(data);
      if (data) {
        setFormData({
          companyName: data.companyName,
          contactName: data.contactName,
          contactEmail: data.contactEmail,
          contactPhone: data.contactPhone,
          street: data.address.street || '',
          city: data.address.city || '',
          state: data.address.state || '',
          zip: data.address.zip || '',
          notes: data.notes || '',
        });
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [partnerId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      await updatePartner(partnerId, {
        companyName: formData.companyName.trim(),
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim(),
        contactPhone: formData.contactPhone.trim(),
        address: {
          street: formData.street.trim() || undefined,
          city: formData.city.trim() || undefined,
          state: formData.state || undefined,
          zip: formData.zip.trim() || undefined,
        },
        notes: formData.notes.trim() || null,
      });
      setEditing(false);
    } catch (err) {
      console.error('Failed to update partner:', err);
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!user) return;
    setProcessing(true);
    try {
      await approvePartner(partnerId, user.uid);
    } catch (err) {
      console.error('Failed to approve partner:', err);
      setError('Failed to approve partner');
    } finally {
      setProcessing(false);
    }
  };

  const handleSuspend = async () => {
    setProcessing(true);
    try {
      await updatePartnerStatus(partnerId, 'suspended');
    } catch (err) {
      console.error('Failed to suspend partner:', err);
      setError('Failed to suspend partner');
    } finally {
      setProcessing(false);
    }
  };

  const handleActivate = async () => {
    setProcessing(true);
    try {
      await updatePartnerStatus(partnerId, 'active');
    } catch (err) {
      console.error('Failed to activate partner:', err);
      setError('Failed to activate partner');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this partner? This action cannot be undone.')) {
      return;
    }

    setProcessing(true);
    try {
      await deletePartner(partnerId);
      router.push('/admin/partners');
    } catch (err) {
      console.error('Failed to delete partner:', err);
      setError('Failed to delete partner');
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!partner) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-white mb-2">Partner not found</h2>
        <Link href="/admin/partners" className="text-gold hover:underline">
          Back to partners
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/partners"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-400" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{partner.companyName}</h1>
              <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[partner.status]}`}>
                {partner.status}
              </span>
            </div>
            <p className="text-gray-400">{partner.contactName}</p>
          </div>
        </div>

        <div className="flex gap-2">
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="p-2 border border-gray-800 rounded-lg text-gray-400 hover:bg-gray-900 transition-colors"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleDelete}
            disabled={processing}
            className="p-2 border border-red-500/50 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      )}

      {/* Status Actions */}
      {!editing && (
        <div className="flex gap-3">
          {partner.status === 'pending' && (
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Approve Partner
            </button>
          )}
          {partner.status === 'active' && (
            <button
              onClick={handleSuspend}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Suspend Partner
            </button>
          )}
          {partner.status === 'suspended' && (
            <button
              onClick={handleActivate}
              disabled={processing}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="h-4 w-4" />
              Reactivate Partner
            </button>
          )}
        </div>
      )}

      {/* Details Card */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-6">
        {editing ? (
          /* Edit Form */
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Building2 className="h-5 w-5 text-gold" />
              </div>
              <h2 className="text-lg font-semibold text-white">Edit Partner</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Company Name</label>
              <input
                type="text"
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contact Name</label>
                <input
                  type="text"
                  name="contactName"
                  value={formData.contactName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  name="contactPhone"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Contact Email</label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Street Address</label>
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">State</label>
                <input
                  type="text"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">ZIP</label>
                <input
                  type="text"
                  name="zip"
                  value={formData.zip}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gold resize-none"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => setEditing(false)}
                className="flex-1 px-4 py-2 border border-gray-800 rounded-lg text-white hover:bg-gray-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gold text-black rounded-lg font-medium hover:bg-gold/90 transition-colors disabled:opacity-50"
              >
                {saving ? <Spinner size="sm" /> : <><Save className="h-4 w-4" /> Save Changes</>}
              </button>
            </div>
          </div>
        ) : (
          /* View Details */
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Building2 className="h-5 w-5 text-gold" />
              </div>
              <h2 className="text-lg font-semibold text-white">Company Details</h2>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center gap-3 text-gray-300">
                <User className="h-4 w-4 text-gray-500" />
                <span>{partner.contactName}</span>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Mail className="h-4 w-4 text-gray-500" />
                <a href={`mailto:${partner.contactEmail}`} className="text-gold hover:underline">
                  {partner.contactEmail}
                </a>
              </div>

              <div className="flex items-center gap-3 text-gray-300">
                <Phone className="h-4 w-4 text-gray-500" />
                <a href={`tel:${partner.contactPhone}`} className="hover:text-white">
                  {partner.contactPhone}
                </a>
              </div>

              {(partner.address.street || partner.address.city) && (
                <div className="flex items-start gap-3 text-gray-300">
                  <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                  <div>
                    {partner.address.street && <p>{partner.address.street}</p>}
                    <p>
                      {[partner.address.city, partner.address.state, partner.address.zip]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 text-gray-300">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Added {partner.createdAt?.toDate().toLocaleDateString()}</span>
              </div>
            </div>

            {partner.notes && (
              <div className="pt-4 border-t border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Notes</h3>
                <p className="text-gray-300">{partner.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

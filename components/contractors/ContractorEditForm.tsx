'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Loader2, ArrowLeft, Trash2, Package, X } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { TagInput } from '@/components/ui/TagInput';
import { Slider } from '@/components/ui/Slider';
import { TerritoryMap } from '@/components/maps/TerritoryMap';
import { Contractor, Trade, ContractorStatus } from '@/types/contractor';
import { updateContractor, deleteContractor } from '@/lib/firebase/contractors';
import { geocodeAddress, buildAddressString } from '@/lib/utils/geocoding';

interface ContractorEditFormProps {
  contractor: Contractor;
  onUpdate: (contractor: Contractor) => void;
}

const tradeOptions = [
  { value: 'installer', label: 'Installer' },
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'service_tech', label: 'Service Tech' },
  { value: 'pm', label: 'Project Manager' },
];

const statusOptions = [
  { value: 'pending', label: 'Pending Approval' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function ContractorEditForm({ contractor, onUpdate }: ContractorEditFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    businessName: contractor.businessName || '',
    status: contractor.status,
    street: contractor.address.street,
    city: contractor.address.city,
    state: contractor.address.state,
    zip: contractor.address.zip,
    trades: contractor.trades,
    skills: contractor.skills,
    serviceRadius: contractor.serviceRadius,
    shippingSameAsAddress: contractor.shippingSameAsAddress !== false,
    shippingStreet: contractor.shippingAddress?.street || '',
    shippingCity: contractor.shippingAddress?.city || '',
    shippingState: contractor.shippingAddress?.state || '',
    shippingZip: contractor.shippingAddress?.zip || '',
  });

  // Shipping address modal state
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [tempShipping, setTempShipping] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(
    contractor.address.lat && contractor.address.lng
      ? { lat: contractor.address.lat, lng: contractor.address.lng }
      : null
  );

  // Auto-geocode address if we have an address but no coordinates
  useEffect(() => {
    if (mapCenter) return;
    const addr = buildAddressString(contractor.address);
    if (!addr) return;
    geocodeAddress(addr).then((result) => {
      if (result) setMapCenter({ lat: result.lat, lng: result.lng });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateContractor(contractor.id, {
        businessName: formData.businessName || null,
        status: formData.status,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          lat: mapCenter?.lat ?? null,
          lng: mapCenter?.lng ?? null,
        },
        trades: formData.trades,
        skills: formData.skills,
        serviceRadius: formData.serviceRadius,
        shippingSameAsAddress: formData.shippingSameAsAddress,
        shippingAddress: formData.shippingSameAsAddress
          ? undefined
          : {
              street: formData.shippingStreet,
              city: formData.shippingCity,
              state: formData.shippingState,
              zip: formData.shippingZip,
            },
      });

      setSuccessMessage('Changes saved successfully');

      // Update parent with new data
      onUpdate({
        ...contractor,
        businessName: formData.businessName || null,
        status: formData.status,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          lat: mapCenter?.lat ?? null,
          lng: mapCenter?.lng ?? null,
        },
        trades: formData.trades,
        skills: formData.skills,
        serviceRadius: formData.serviceRadius,
        shippingSameAsAddress: formData.shippingSameAsAddress,
        shippingAddress: formData.shippingSameAsAddress
          ? undefined
          : {
              street: formData.shippingStreet,
              city: formData.shippingCity,
              state: formData.shippingState,
              zip: formData.shippingZip,
            },
      });
    } catch (err) {
      setError('Failed to save changes');
      console.error('Error updating contractor:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await deleteContractor(contractor.id);
      router.push('/kts');
    } catch (err) {
      setError('Failed to delete contractor');
      console.error('Error deleting contractor:', err);
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => router.push(`/kts/${contractor.id}`)}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-500 border-red-500/30 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <p className="text-red-500">{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
          <p className="text-green-500">{successMessage}</p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-red-500">Delete Contractor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-400">
                Are you sure you want to delete{' '}
                <span className="text-white font-medium">
                  {contractor.businessName || 'this contractor'}
                </span>
                ? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex-1 bg-red-500 hover:bg-red-600"
                >
                  {deleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Delete'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Business Name"
              value={formData.businessName}
              onChange={(e) => updateField('businessName', e.target.value)}
              placeholder="Company or individual name"
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => updateField('status', e.target.value as ContractorStatus)}
              options={statusOptions}
            />

            <MultiSelect
              label="Trades"
              options={tradeOptions}
              value={formData.trades}
              onChange={(trades) => updateField('trades', trades as Trade[])}
              placeholder="Select trades..."
            />

            <TagInput
              label="Skills & Certifications"
              value={formData.skills}
              onChange={(skills) => updateField('skills', skills)}
              placeholder="Press Enter to add..."
            />
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Street Address"
              value={formData.street}
              onChange={(e) => updateField('street', e.target.value)}
              placeholder="123 Main St"
            />

            <Input
              label="City"
              value={formData.city}
              onChange={(e) => updateField('city', e.target.value)}
              placeholder="City"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">
                  State
                </label>
                <select
                  value={formData.state}
                  onChange={(e) => updateField('state', e.target.value)}
                  className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
                >
                  <option value="">Select</option>
                  {usStates.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="ZIP"
                value={formData.zip}
                onChange={(e) => updateField('zip', e.target.value)}
                placeholder="12345"
              />
            </div>
          </CardContent>
        </Card>

        {/* Shipping Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Shipping Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.shippingSameAsAddress}
                onChange={(e) => {
                  const checked = e.target.checked;
                  updateField('shippingSameAsAddress', checked);
                  if (!checked && !formData.shippingStreet) {
                    setTempShipping({ street: '', city: '', state: '', zip: '' });
                    setShowShippingModal(true);
                  }
                }}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-brand-gold focus:ring-brand-gold"
              />
              <span className="text-sm text-gray-300">Same as address</span>
            </label>

            {!formData.shippingSameAsAddress && (
              <>
                {formData.shippingStreet ? (
                  <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <p className="text-white text-sm">
                      {formData.shippingStreet}
                    </p>
                    <p className="text-gray-400 text-sm">
                      {[formData.shippingCity, formData.shippingState].filter(Boolean).join(', ')}{' '}
                      {formData.shippingZip}
                    </p>
                    <Button
                      variant="outline"
                      className="mt-2 text-xs"
                      onClick={() => {
                        setTempShipping({
                          street: formData.shippingStreet,
                          city: formData.shippingCity,
                          state: formData.shippingState,
                          zip: formData.shippingZip,
                        });
                        setShowShippingModal(true);
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTempShipping({ street: '', city: '', state: '', zip: '' });
                      setShowShippingModal(true);
                    }}
                  >
                    Add Shipping Address
                  </Button>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Shipping Address Modal */}
        {showShippingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-brand-charcoal border border-gray-700 rounded-xl max-w-md w-full">
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold text-white">Shipping Address</h3>
                <button
                  onClick={() => setShowShippingModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <Input
                  label="Street Address"
                  value={tempShipping.street}
                  onChange={(e) => setTempShipping((prev) => ({ ...prev, street: e.target.value }))}
                  placeholder="123 Main St"
                />
                <Input
                  label="City"
                  value={tempShipping.city}
                  onChange={(e) => setTempShipping((prev) => ({ ...prev, city: e.target.value }))}
                  placeholder="City"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      State
                    </label>
                    <select
                      value={tempShipping.state}
                      onChange={(e) => setTempShipping((prev) => ({ ...prev, state: e.target.value }))}
                      className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    >
                      <option value="">Select</option>
                      {usStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="ZIP"
                    value={tempShipping.zip}
                    onChange={(e) => setTempShipping((prev) => ({ ...prev, zip: e.target.value }))}
                    placeholder="12345"
                  />
                </div>
              </div>
              <div className="flex gap-3 p-4 border-t border-gray-700">
                <Button
                  variant="outline"
                  onClick={() => setShowShippingModal(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      shippingStreet: tempShipping.street,
                      shippingCity: tempShipping.city,
                      shippingState: tempShipping.state,
                      shippingZip: tempShipping.zip,
                    }));
                    setShowShippingModal(false);
                    setSuccessMessage(null);
                  }}
                  className="flex-1"
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Service Area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Service Area</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Slider
              label="Service Radius"
              value={formData.serviceRadius}
              onChange={(value) => updateField('serviceRadius', value)}
              min={5}
              max={400}
              step={5}
              formatValue={(value) => `${value} miles`}
            />

            <TerritoryMap
              center={mapCenter}
              radius={formData.serviceRadius}
              onCenterChange={setMapCenter}
              className="h-[400px]"
              interactive={true}
            />

            <p className="text-xs text-gray-500">
              Drag the marker to adjust the service area center. The circle shows the coverage radius.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

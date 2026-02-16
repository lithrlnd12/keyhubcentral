'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge, BackButton } from '@/components/ui';
import { Input } from '@/components/ui/Input';
import { Slider } from '@/components/ui/Slider';
import { Button } from '@/components/ui/Button';
import { TagInput } from '@/components/ui/TagInput';
import { TerritoryMap } from '@/components/maps/TerritoryMap';
import { Pencil, Save, Loader2, Package, X, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/hooks';
import { findAndLinkContractor, updateContractor, createContractor } from '@/lib/firebase/contractors';
import { deleteField, Timestamp } from 'firebase/firestore';
import { geocodeAddress, buildAddressString } from '@/lib/utils/geocoding';
import { Contractor, getRatingTier } from '@/types/contractor';

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export default function PortalProfilePage() {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Editable form state
  const [formData, setFormData] = useState({
    businessName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    zip: '',
    skills: [] as string[],
    serviceRadius: 50,
    shippingSameAsAddress: true,
    shippingStreet: '',
    shippingCity: '',
    shippingState: '',
    shippingZip: '',
  });

  // Shipping address modal
  const [showShippingModal, setShowShippingModal] = useState(false);
  const [tempShipping, setTempShipping] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
  });

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    async function loadContractor() {
      if (user?.uid && user?.email) {
        try {
          let data = await findAndLinkContractor(user.uid, user.email);

          // Auto-create contractor record if none exists
          if (!data) {
            const now = Timestamp.now();
            const newContractor = {
              userId: user.uid,
              email: user.email.toLowerCase(),
              phone: user.phone || '',
              businessName: user.displayName || null,
              address: { street: '', city: '', state: '', zip: '' },
              trades: [] as ('installer' | 'sales_rep' | 'service_tech' | 'pm')[],
              skills: [] as string[],
              licenses: [],
              insurance: null,
              w9Url: null,
              achInfo: null,
              serviceRadius: 25,
              rating: { overall: 3.0, customer: 3.0, speed: 3.0, warranty: 3.0, internal: 3.0 },
              status: 'active' as const,
            };
            const docId = await createContractor(newContractor);
            data = { id: docId, ...newContractor, createdAt: now, updatedAt: now };
          }

          setContractor(data);
          resetForm(data);
          if (data.address?.lat && data.address?.lng) {
            setMapCenter({ lat: data.address.lat, lng: data.address.lng });
          } else {
            const addr = buildAddressString(data.address);
            if (addr) {
              const result = await geocodeAddress(addr);
              if (result) setMapCenter({ lat: result.lat, lng: result.lng });
            }
          }
        } catch (err) {
          console.error('Error loading contractor:', err);
        } finally {
          setLoading(false);
        }
      } else if (user?.uid) {
        setLoading(false);
      }
    }
    loadContractor();
  }, [user?.uid, user?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm(c: Contractor) {
    setFormData({
      businessName: c.businessName || '',
      phone: c.phone || user?.phone || '',
      street: c.address?.street || '',
      city: c.address?.city || '',
      state: c.address?.state || '',
      zip: c.address?.zip || '',
      skills: c.skills || [],
      serviceRadius: c.serviceRadius || 50,
      shippingSameAsAddress: c.shippingSameAsAddress !== false,
      shippingStreet: c.shippingAddress?.street || '',
      shippingCity: c.shippingAddress?.city || '',
      shippingState: c.shippingAddress?.state || '',
      shippingZip: c.shippingAddress?.zip || '',
    });
  }

  const handleCancel = () => {
    if (contractor) resetForm(contractor);
    setEditing(false);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!contractor) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Re-geocode if address changed
      let lat = mapCenter?.lat ?? null;
      let lng = mapCenter?.lng ?? null;
      const addressChanged =
        formData.street !== (contractor.address?.street || '') ||
        formData.city !== (contractor.address?.city || '') ||
        formData.state !== (contractor.address?.state || '') ||
        formData.zip !== (contractor.address?.zip || '');

      if (addressChanged) {
        const addr = buildAddressString({
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
        });
        if (addr) {
          const result = await geocodeAddress(addr);
          if (result) {
            lat = result.lat;
            lng = result.lng;
            setMapCenter({ lat, lng });
          }
        }
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = {
        businessName: formData.businessName || null,
        phone: formData.phone || null,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          lat,
          lng,
        },
        skills: formData.skills,
        serviceRadius: formData.serviceRadius,
        shippingSameAsAddress: formData.shippingSameAsAddress,
        shippingAddress: formData.shippingSameAsAddress
          ? deleteField()
          : {
              street: formData.shippingStreet,
              city: formData.shippingCity,
              state: formData.shippingState,
              zip: formData.shippingZip,
            },
      };

      await updateContractor(contractor.id, updates);

      const updated: Contractor = {
        ...contractor,
        businessName: formData.businessName || null,
        phone: formData.phone || undefined,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
          lat,
          lng,
        },
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
      };
      setContractor(updated);
      setEditing(false);
      setSuccessMessage('Profile updated successfully');
    } catch (err) {
      console.error('Error saving profile:', err);
      setError('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSuccessMessage(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton href="/portal" />
          <div>
            <h1 className="text-2xl font-bold text-white">My Profile</h1>
            <p className="text-gray-400 mt-1">
              {editing ? 'Edit your profile information' : 'View and manage your profile'}
            </p>
          </div>
        </div>

        {contractor && !editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}

        {editing && (
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
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
        )}
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Account Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400">Name</label>
              <p className="text-white">{user?.displayName || 'N/A'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-400">Email</label>
              <p className="text-white">{user?.email || 'N/A'}</p>
            </div>
            {editing ? (
              <Input
                label="Phone"
                value={formData.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(555) 123-4567"
              />
            ) : (
              <div>
                <label className="text-sm text-gray-400">Phone</label>
                <p className="text-white">{contractor?.phone || user?.phone || 'N/A'}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Contractor Details */}
        {contractor && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contractor Details</h2>
            <div className="space-y-4">
              {editing ? (
                <Input
                  label="Business Name"
                  value={formData.businessName}
                  onChange={(e) => updateField('businessName', e.target.value)}
                  placeholder="Company or individual name"
                />
              ) : (
                <div>
                  <label className="text-sm text-gray-400">Business Name</label>
                  <p className="text-white">{contractor.businessName || 'N/A'}</p>
                </div>
              )}
              <div>
                <label className="text-sm text-gray-400">Status</label>
                <div className="mt-1">
                  <Badge variant={contractor.status === 'active' ? 'success' : 'warning'}>
                    {contractor.status}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400">Trades</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {contractor.trades?.map((trade) => (
                    <span
                      key={trade}
                      className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                    >
                      {trade}
                    </span>
                  )) || (
                    <span className="text-gray-500 text-sm">No trades assigned</span>
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400">Tier</label>
                <p className="text-white capitalize">
                  {contractor.rating?.overall
                    ? getRatingTier(contractor.rating.overall).replace('_', ' ')
                    : 'N/A'}
                </p>
              </div>
              {editing ? (
                <TagInput
                  label="Skills & Certifications"
                  value={formData.skills}
                  onChange={(skills) => updateField('skills', skills)}
                  placeholder="Press Enter to add..."
                />
              ) : (
                contractor.skills?.length > 0 && (
                  <div>
                    <label className="text-sm text-gray-400">Skills & Certifications</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {contractor.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </Card>
        )}

        {/* No contractor record notice */}
        {!contractor && !loading && (
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-white font-medium">Contractor profile not found</h3>
                <p className="text-gray-400 text-sm mt-1">
                  Your account hasn&apos;t been linked to a contractor record yet. Please contact an administrator to set up your contractor profile.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Address */}
        {contractor && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Address</h2>
            {editing ? (
              <div className="space-y-4">
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
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">State</label>
                    <select
                      value={formData.state}
                      onChange={(e) => updateField('state', e.target.value)}
                      className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    >
                      <option value="">Select</option>
                      {usStates.map((s) => (
                        <option key={s} value={s}>{s}</option>
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
              </div>
            ) : (
              <div>
                {contractor.address?.street ? (
                  <p className="text-white">
                    {contractor.address.street}
                    <br />
                    {contractor.address.city}, {contractor.address.state} {contractor.address.zip}
                  </p>
                ) : (
                  <p className="text-gray-500">No address on file</p>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Shipping Address */}
        {contractor && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Shipping Address
            </h2>
            {editing ? (
              <div className="space-y-4">
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
                        <p className="text-white text-sm">{formData.shippingStreet}</p>
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
              </div>
            ) : (
              <div>
                {contractor.shippingSameAsAddress === false && contractor.shippingAddress ? (
                  <p className="text-white">
                    {contractor.shippingAddress.street}
                    <br />
                    {contractor.shippingAddress.city}, {contractor.shippingAddress.state}{' '}
                    {contractor.shippingAddress.zip}
                  </p>
                ) : (
                  <p className="text-gray-500">Same as address</p>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Service Area */}
        {contractor && (
          <Card className="p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Service Area</h2>
            <div className="space-y-4">
              {editing ? (
                <>
                  <Slider
                    label="How far are you willing to travel?"
                    value={formData.serviceRadius}
                    onChange={(value) => updateField('serviceRadius', value)}
                    min={5}
                    max={400}
                    step={5}
                    formatValue={(value) => `${value} miles`}
                  />
                  {mapCenter && (
                    <TerritoryMap
                      center={mapCenter}
                      radius={formData.serviceRadius}
                      className="h-[350px]"
                      interactive={false}
                    />
                  )}
                </>
              ) : (
                <>
                  <div>
                    <label className="text-sm text-gray-400">Service Radius</label>
                    <p className="text-white">{contractor.serviceRadius || 50} miles</p>
                  </div>
                  {mapCenter && (
                    <TerritoryMap
                      center={mapCenter}
                      radius={contractor.serviceRadius || 50}
                      className="h-[300px]"
                      interactive={false}
                    />
                  )}
                </>
              )}
            </div>
          </Card>
        )}
      </div>

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
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">State</label>
                  <select
                    value={tempShipping.state}
                    onChange={(e) => setTempShipping((prev) => ({ ...prev, state: e.target.value }))}
                    className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  >
                    <option value="">Select</option>
                    {usStates.map((s) => (
                      <option key={s} value={s}>{s}</option>
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

      {!editing && (
        <Card className="p-4 bg-gray-800/50">
          <p className="text-gray-400 text-sm">
            Status, trades, and tier are managed by an administrator.
          </p>
        </Card>
      )}
    </div>
  );
}

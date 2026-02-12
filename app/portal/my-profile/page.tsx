'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge, BackButton } from '@/components/ui';
import { Slider } from '@/components/ui/Slider';
import { TerritoryMap } from '@/components/maps/TerritoryMap';
import { useAuth } from '@/lib/hooks';
import { findAndLinkContractor, updateContractor } from '@/lib/firebase/contractors';
import { Contractor, getRatingTier } from '@/types/contractor';

export default function PortalProfilePage() {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  // Service area editing
  const [editingServiceArea, setEditingServiceArea] = useState(false);
  const [serviceRadius, setServiceRadius] = useState(50);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadContractor() {
      if (user?.uid && user?.email) {
        try {
          const data = await findAndLinkContractor(user.uid, user.email);
          setContractor(data);
          if (data) setServiceRadius(data.serviceRadius || 50);
        } catch (error) {
          console.error('Error loading contractor:', error);
        } finally {
          setLoading(false);
        }
      } else if (user?.uid) {
        setLoading(false);
      }
    }
    loadContractor();
  }, [user?.uid, user?.email]);

  const handleSaveServiceRadius = async () => {
    if (!contractor) return;
    setSaving(true);
    try {
      await updateContractor(contractor.id, { serviceRadius });
      setContractor({ ...contractor, serviceRadius });
      setEditingServiceArea(false);
    } catch (error) {
      console.error('Error saving service radius:', error);
    } finally {
      setSaving(false);
    }
  };

  const mapCenter = contractor?.address?.lat && contractor?.address?.lng
    ? { lat: contractor.address.lat, lng: contractor.address.lng }
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/portal" />
        <div>
          <h1 className="text-2xl font-bold text-white">My Profile</h1>
          <p className="text-gray-400 mt-1">
            View your contractor profile information
          </p>
        </div>
      </div>

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
            <div>
              <label className="text-sm text-gray-400">Phone</label>
              <p className="text-white">{user?.phone || 'N/A'}</p>
            </div>
          </div>
        </Card>

        {/* Contractor Info */}
        {contractor && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Contractor Details</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Business Name</label>
                <p className="text-white">{contractor.businessName || 'N/A'}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Status</label>
                <div className="mt-1">
                  <Badge
                    variant={contractor.status === 'active' ? 'success' : 'warning'}
                  >
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
            </div>
          </Card>
        )}

        {/* Service Area */}
        {contractor?.address && (
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Service Area</h2>
              {!editingServiceArea ? (
                <button
                  onClick={() => setEditingServiceArea(true)}
                  className="text-sm text-gold hover:text-gold/80 transition-colors"
                >
                  Edit
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setServiceRadius(contractor.serviceRadius || 50);
                      setEditingServiceArea(false);
                    }}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveServiceRadius}
                    disabled={saving}
                    className="text-sm px-3 py-1 bg-gold/20 text-gold border border-gold/30 rounded-lg hover:bg-gold/30 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Address</label>
                <p className="text-white">
                  {contractor.address.street && `${contractor.address.street}, `}
                  {contractor.address.city}, {contractor.address.state} {contractor.address.zip}
                </p>
              </div>

              {editingServiceArea ? (
                <div className="space-y-4">
                  <Slider
                    label="How far are you willing to travel?"
                    value={serviceRadius}
                    onChange={setServiceRadius}
                    min={5}
                    max={400}
                    step={5}
                    formatValue={(value) => `${value} miles`}
                  />
                  <TerritoryMap
                    center={mapCenter}
                    radius={serviceRadius}
                    className="h-[350px]"
                    interactive={false}
                  />
                </div>
              ) : (
                <div>
                  <label className="text-sm text-gray-400">Service Radius</label>
                  <p className="text-white">{contractor.serviceRadius || 50} miles</p>
                  {mapCenter && (
                    <div className="mt-3">
                      <TerritoryMap
                        center={mapCenter}
                        radius={contractor.serviceRadius || 50}
                        className="h-[300px]"
                        interactive={false}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <Card className="p-4 bg-gray-800/50">
        <p className="text-gray-400 text-sm">
          To update other profile information, please contact an administrator.
        </p>
      </Card>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/hooks';
import { getContractorByUserId } from '@/lib/firebase/contractors';
import { Contractor, getRatingTier } from '@/types/contractor';

export default function PortalProfilePage() {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContractor() {
      if (user?.uid) {
        try {
          const data = await getContractorByUserId(user.uid);
          setContractor(data);
        } catch (error) {
          console.error('Error loading contractor:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadContractor();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <p className="text-gray-400 mt-1">
          View your contractor profile information
        </p>
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

        {/* Address */}
        {contractor?.address && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Service Area</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Address</label>
                <p className="text-white">
                  {contractor.address.street && `${contractor.address.street}, `}
                  {contractor.address.city}, {contractor.address.state} {contractor.address.zip}
                </p>
              </div>
              {contractor.serviceRadius && (
                <div>
                  <label className="text-sm text-gray-400">Service Radius</label>
                  <p className="text-white">{contractor.serviceRadius} miles</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      <Card className="p-4 bg-gray-800/50">
        <p className="text-gray-400 text-sm">
          To update your profile information, please contact an administrator.
        </p>
      </Card>
    </div>
  );
}

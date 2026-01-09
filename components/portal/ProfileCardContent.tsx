'use client';

import { Badge } from '@/components/ui/Badge';
import { Contractor, getRatingTier } from '@/types/contractor';
import { User as FirebaseUser } from 'firebase/auth';

interface ProfileCardContentProps {
  user: FirebaseUser & { phone?: string };
  contractor: Contractor | null;
}

export function ProfileCardContent({ user, contractor }: ProfileCardContentProps) {
  const tier = contractor?.rating?.overall
    ? getRatingTier(contractor.rating.overall)
    : null;

  return (
    <div className="space-y-4">
      {/* Account Info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500">Name</p>
          <p className="text-sm text-white">{user?.displayName || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Email</p>
          <p className="text-sm text-white truncate">{user?.email || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Phone</p>
          <p className="text-sm text-white">{user?.phone || 'N/A'}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Status</p>
          <Badge variant={contractor?.status === 'active' ? 'success' : 'warning'}>
            {contractor?.status || 'Unknown'}
          </Badge>
        </div>
      </div>

      {/* Contractor Details */}
      {contractor && (
        <>
          <div className="border-t border-gray-800 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Business Name</p>
                <p className="text-sm text-white">{contractor.businessName || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Tier</p>
                <p className="text-sm text-white capitalize">
                  {tier ? tier.replace('_', ' ') : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Trades */}
          <div>
            <p className="text-xs text-gray-500 mb-2">Trades</p>
            <div className="flex flex-wrap gap-1">
              {contractor.trades?.length ? (
                contractor.trades.map((trade) => (
                  <span
                    key={trade}
                    className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded"
                  >
                    {trade}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-xs">No trades assigned</span>
              )}
            </div>
          </div>

          {/* Service Area */}
          {contractor.address && (
            <div>
              <p className="text-xs text-gray-500 mb-1">Service Area</p>
              <p className="text-sm text-white">
                {contractor.address.city}, {contractor.address.state}
                {contractor.serviceRadius && ` (${contractor.serviceRadius} mi radius)`}
              </p>
            </div>
          )}
        </>
      )}

      <div className="bg-gray-800/50 rounded-lg p-3">
        <p className="text-xs text-gray-400">
          To update your profile, contact an administrator.
        </p>
      </div>
    </div>
  );
}

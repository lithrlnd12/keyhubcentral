'use client';

import { useState, useMemo } from 'react';
import { Lead, AssignedType } from '@/types/lead';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { assignLead } from '@/lib/firebase/leads';
import { useUsersByRole } from '@/lib/hooks';
import { UserPlus, Users, Building2, X } from 'lucide-react';

interface LeadAssignmentProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: () => void;
}

const MAX_DISTANCE_MILES = 50;
const INTERNAL_ROLES: ('sales_rep' | 'admin' | 'owner')[] = ['sales_rep', 'admin', 'owner'];

export function LeadAssignment({
  lead,
  isOpen,
  onClose,
  onAssigned,
}: LeadAssignmentProps) {
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedType, setAssignedType] = useState<AssignedType>('internal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize lead coordinates to prevent hook refetching
  const leadLat = lead.customer.address?.lat;
  const leadLng = lead.customer.address?.lng;
  const leadCoordinates = useMemo(
    () => (leadLat && leadLng ? { lat: leadLat, lng: leadLng } : undefined),
    [leadLat, leadLng]
  );
  const maxDistance = leadCoordinates ? MAX_DISTANCE_MILES : undefined;

  // Fetch sales reps for internal assignments (within 50 miles if coordinates available)
  const { users: salesReps, loading: loadingSalesReps } = useUsersByRole({
    roles: INTERNAL_ROLES,
    coordinates: leadCoordinates,
    maxDistanceMiles: maxDistance,
  });

  // Fetch subscribers for subscriber assignments (within 50 miles if coordinates available)
  const { users: subscribers, loading: loadingSubscribers } = useUsersByRole({
    role: 'subscriber',
    coordinates: leadCoordinates,
    maxDistanceMiles: maxDistance,
  });

  // Build dropdown options based on assignment type
  const userOptions = useMemo(() => {
    const users = assignedType === 'internal' ? salesReps : subscribers;
    return users.map((user) => ({
      value: user.uid,
      label: user.distance !== undefined
        ? `${user.displayName} (${user.distance.toFixed(1)} mi)`
        : `${user.displayName} (no location)`,
    }));
  }, [assignedType, salesReps, subscribers]);

  const isLoadingUsers = assignedType === 'internal' ? loadingSalesReps : loadingSubscribers;
  const hasNoUsers = !isLoadingUsers && userOptions.length === 0;

  // Check if we have any users with coordinates (within range)
  const users = assignedType === 'internal' ? salesReps : subscribers;
  const hasUsersWithinRange = users.some((u) => u.distance !== undefined);

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!assignedTo) {
      setError('Please select an assignee');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await assignLead(lead.id, assignedTo, assignedType);
      onAssigned?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-gold" />
            Assign Lead
          </CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lead Info */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-white font-medium">{lead.customer.name}</p>
            <p className="text-sm text-gray-400">
              {lead.trade} • {lead.customer.address.city}
            </p>
          </div>

          {/* Assignment Type */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Assignment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAssignedType('internal');
                  setAssignedTo('');
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  assignedType === 'internal'
                    ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Internal (KR)
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignedType('subscriber');
                  setAssignedTo('');
                }}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  assignedType === 'subscriber'
                    ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Subscriber
              </button>
            </div>
          </div>

          {/* Assignee Selection */}
          <div className="space-y-2">
            <Select
              label={assignedType === 'internal' ? 'Sales Rep' : 'Subscriber'}
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              options={userOptions}
              placeholder={
                isLoadingUsers
                  ? 'Loading...'
                  : hasNoUsers
                  ? `No ${assignedType === 'internal' ? 'sales reps' : 'subscribers'} available`
                  : assignedType === 'internal'
                  ? 'Select a sales rep'
                  : 'Select a subscriber'
              }
              disabled={isLoadingUsers || hasNoUsers}
            />
            {leadCoordinates && !isLoadingUsers && hasUsersWithinRange && (
              <p className="text-xs text-gray-500">
                Showing users within {MAX_DISTANCE_MILES} miles of lead location
              </p>
            )}
            {leadCoordinates && !isLoadingUsers && !hasUsersWithinRange && userOptions.length > 0 && (
              <p className="text-xs text-yellow-500">
                No users within {MAX_DISTANCE_MILES} miles - showing users without location set
              </p>
            )}
            {!leadCoordinates && !isLoadingUsers && userOptions.length > 0 && (
              <p className="text-xs text-yellow-500">
                Lead has no coordinates - showing all users
              </p>
            )}
          </div>

          {/* Error */}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} className="flex-1" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Lead'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

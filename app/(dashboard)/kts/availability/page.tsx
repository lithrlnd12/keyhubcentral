'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { AvailabilityCalendar } from '@/components/availability';
import { canManageUsers } from '@/types/user';

export default function KTSAvailabilityPage() {
  const { user } = useAuth();

  // PMs, admins, and owners can edit all availability
  const canEdit = user?.role && canManageUsers(user.role);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white">Contractor Availability</h2>
        <p className="text-gray-400 mt-1">
          View and manage contractor schedules and availability
        </p>
      </div>

      <AvailabilityCalendar canEdit={canEdit} />
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { BackButton } from '@/components/ui';
import { useAuth } from '@/lib/hooks';
import { getContractorByUserId } from '@/lib/firebase/contractors';
import { Contractor } from '@/types/contractor';
import { ContractorCalendar } from '@/components/portal';

export default function PortalCalendarPage() {
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
        <div className="animate-spin h-8 w-8 border-2 border-brand-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!contractor) {
    return (
      <Card className="p-6">
        <p className="text-gray-400">
          Your contractor profile has not been set up yet. Please contact an administrator.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/portal" />
        <div>
          <h1 className="text-2xl font-bold text-white">My Calendar</h1>
          <p className="text-gray-400 mt-1">
            View your scheduled jobs and availability
          </p>
        </div>
      </div>

      <ContractorCalendar contractor={contractor} />
    </div>
  );
}

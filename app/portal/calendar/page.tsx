'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { BackButton } from '@/components/ui';
import { useAuth } from '@/lib/hooks';
import { findAndLinkContractor } from '@/lib/firebase/contractors';
import { Contractor } from '@/types/contractor';
import { ContractorCalendar, GoogleCalendarOnlyView } from '@/components/portal';
import { AlertCircle } from 'lucide-react';

export default function PortalCalendarPage() {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContractor() {
      if (user?.uid && user?.email) {
        try {
          // Try to find contractor by userId or email, auto-link if found by email
          const data = await findAndLinkContractor(user.uid, user.email);
          setContractor(data);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-brand-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton href="/portal" />
        <div>
          <h1 className="text-2xl font-bold text-white">My Calendar</h1>
          <p className="text-gray-400 mt-1">
            View your scheduled jobs and Google Calendar events
          </p>
        </div>
      </div>

      {!contractor && (
        <Card className="p-4 border-yellow-500/30 bg-yellow-500/10">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-400 font-medium">Contractor profile not linked</p>
              <p className="text-gray-400 text-sm mt-1">
                Your user account is not linked to a contractor profile. You can still view your Google Calendar events below.
                Contact an administrator to link your contractor profile to see assigned jobs.
              </p>
            </div>
          </div>
        </Card>
      )}

      {contractor ? (
        <ContractorCalendar contractor={contractor} />
      ) : (
        <GoogleCalendarOnlyView />
      )}
    </div>
  );
}

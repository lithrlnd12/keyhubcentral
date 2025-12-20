'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { AvailabilityCalendar } from '@/components/contractors/portal';
import { useAuth } from '@/lib/hooks/useAuth';
import { useContractorByUserId } from '@/lib/hooks/useContractor';

export default function AvailabilityPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { contractor, loading: contractorLoading } = useContractorByUserId(
    user?.uid || ''
  );

  // Only contractors can access this page
  useEffect(() => {
    if (!authLoading && user && user.role !== 'contractor') {
      router.push('/overview');
    }
  }, [authLoading, user, router]);

  if (authLoading || contractorLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || user.role !== 'contractor') {
    return null;
  }

  if (!contractor) {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-6 text-center">
        <p className="text-yellow-500">
          Your contractor profile is not set up yet. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Availability Calendar</h1>
          <p className="text-gray-400 mt-1">
            Set your availability to let us know when you can take jobs.
          </p>
        </div>
      </div>

      <AvailabilityCalendar contractorId={contractor.id} />
    </div>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Briefcase, DollarSign } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { Card, CardContent } from '@/components/ui/Card';
import { EarningsSummary, MyJobsPreview } from '@/components/contractors/portal';
import { RatingCard } from '@/components/contractors';
import { useAuth } from '@/lib/hooks/useAuth';
import { useContractorByUserId } from '@/lib/hooks/useContractor';

export default function ContractorPortalPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { contractor, loading: contractorLoading } = useContractorByUserId(
    user?.uid || ''
  );

  // Only contractors can access the portal
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{contractor?.businessName ? `, ${contractor.businessName}` : ''}
        </h1>
        <p className="text-gray-400 mt-1">
          Manage your jobs, availability, and earnings.
        </p>
      </div>

      {/* Earnings Summary */}
      <EarningsSummary />

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/portal/availability">
          <Card className="hover:border-brand-gold/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-brand-gold/20">
                  <Calendar className="w-6 h-6 text-brand-gold" />
                </div>
                <div>
                  <p className="font-medium text-white">Availability</p>
                  <p className="text-sm text-gray-400">Set your schedule</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/jobs">
          <Card className="hover:border-brand-gold/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Briefcase className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-white">My Jobs</p>
                  <p className="text-sm text-gray-400">View all your jobs</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/portal/earnings">
          <Card className="hover:border-brand-gold/50 transition-colors cursor-pointer">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-green-500/20">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Earnings</p>
                  <p className="text-sm text-gray-400">View payment history</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MyJobsPreview />

        {contractor && (
          <RatingCard rating={contractor.rating} compact={false} />
        )}
      </div>
    </div>
  );
}

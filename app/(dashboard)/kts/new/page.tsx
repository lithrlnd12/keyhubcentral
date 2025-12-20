'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { OnboardingWizard } from '@/components/contractors/onboarding';
import { useAuth } from '@/lib/hooks/useAuth';
import { canManageUsers } from '@/types/user';
import { Spinner } from '@/components/ui/Spinner';

export default function NewContractorPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const canAccess = user?.role && canManageUsers(user.role);

  useEffect(() => {
    if (!loading && !canAccess) {
      router.push('/kts');
    }
  }, [loading, canAccess, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!canAccess) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/kts"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Contractors</span>
        </Link>

        <h1 className="text-xl font-bold text-white">Add New Contractor</h1>
        <p className="text-gray-400 mt-1">
          Complete the onboarding wizard to add a new contractor.
        </p>
      </div>

      <OnboardingWizard />
    </div>
  );
}

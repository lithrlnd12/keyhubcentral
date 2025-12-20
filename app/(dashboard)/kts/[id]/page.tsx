'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import {
  ContractorHeader,
  ContractorInfo,
  ContractorDocuments,
  ContractorPerformance,
  ContractorJobs,
} from '@/components/contractors';
import { useContractor } from '@/lib/hooks/useContractor';
import { useAuth } from '@/lib/hooks/useAuth';
import { canManageUsers, canViewAllContractors } from '@/types/user';

interface ContractorDetailPageProps {
  params: { id: string };
}

export default function ContractorDetailPage({ params }: ContractorDetailPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { contractor, loading, error } = useContractor(params.id);

  // Check if user can view this contractor
  const canView =
    user?.role &&
    (canViewAllContractors(user.role) || contractor?.userId === user.uid);

  const canEdit = user?.role && canManageUsers(user.role);

  useEffect(() => {
    if (!loading && !contractor) {
      notFound();
    }
  }, [loading, contractor]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!contractor) {
    return null;
  }

  if (!canView) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-500">You don&apos;t have permission to view this contractor.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ContractorHeader contractor={contractor} canEdit={canEdit} />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Profile</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <ContractorInfo contractor={contractor} />
        </TabsContent>

        <TabsContent value="documents">
          <ContractorDocuments contractor={contractor} />
        </TabsContent>

        <TabsContent value="performance">
          <ContractorPerformance contractor={contractor} />
        </TabsContent>

        <TabsContent value="jobs">
          <ContractorJobs contractorId={contractor.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

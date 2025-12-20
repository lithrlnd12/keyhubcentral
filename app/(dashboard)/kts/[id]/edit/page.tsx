'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ContractorEditForm } from '@/components/contractors/ContractorEditForm';
import { RatingEditor } from '@/components/contractors/RatingEditor';
import { useContractor } from '@/lib/hooks/useContractor';
import { useAuth } from '@/lib/hooks/useAuth';
import { canManageUsers } from '@/types/user';
import { Contractor, Rating } from '@/types/contractor';

interface ContractorEditPageProps {
  params: { id: string };
}

export default function ContractorEditPage({ params }: ContractorEditPageProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { contractor: initialContractor, loading, error } = useContractor(params.id);
  const [contractor, setContractor] = useState<Contractor | null>(null);

  // Sync contractor state when loaded
  useEffect(() => {
    if (initialContractor) {
      setContractor(initialContractor);
    }
  }, [initialContractor]);

  // Check permissions
  const canEdit = user?.role && canManageUsers(user.role);

  useEffect(() => {
    if (!loading && !initialContractor) {
      notFound();
    }
  }, [loading, initialContractor]);

  // Redirect if no permission
  useEffect(() => {
    if (!loading && user && !canEdit) {
      router.push(`/kts/${params.id}`);
    }
  }, [loading, user, canEdit, router, params.id]);

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

  if (!canEdit) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-500">You don&apos;t have permission to edit contractors.</p>
      </div>
    );
  }

  const handleContractorUpdate = (updated: Contractor) => {
    setContractor(updated);
  };

  const handleRatingUpdate = (rating: Rating) => {
    setContractor((prev) => prev ? { ...prev, rating } : null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Edit {contractor.businessName || 'Contractor'}
        </h1>
        <p className="text-gray-400 mt-1">
          Update contractor profile, documents, and performance ratings.
        </p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="ratings">Ratings</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <ContractorEditForm contractor={contractor} onUpdate={handleContractorUpdate} />
        </TabsContent>

        <TabsContent value="ratings">
          <div className="max-w-xl">
            <RatingEditor
              contractorId={contractor.id}
              rating={contractor.rating}
              onUpdate={handleRatingUpdate}
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

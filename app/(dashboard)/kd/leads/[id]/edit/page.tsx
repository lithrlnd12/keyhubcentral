'use client';

import { useParams } from 'next/navigation';
import { useLead } from '@/lib/hooks/useLead';
import { useAuth } from '@/lib/hooks/useAuth';
import { LeadForm } from '@/components/leads';
import { Spinner } from '@/components/ui/Spinner';
import { redirect } from 'next/navigation';

export default function EditLeadPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { lead, loading, error } = useLead(id);

  // Admins can edit any lead, sales reps can edit leads assigned to them
  const isAdmin = user?.role && ['owner', 'admin'].includes(user.role);
  const isAssignedSalesRep = user?.role === 'sales_rep' && lead?.assignedTo === user?.uid;
  const canEdit = isAdmin || isAssignedSalesRep;

  if (!authLoading && !loading && user && !canEdit) {
    redirect(`/kd/leads/${id}`);
  }

  if (loading || authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Lead not found</p>
      </div>
    );
  }

  return <LeadForm lead={lead} mode="edit" />;
}

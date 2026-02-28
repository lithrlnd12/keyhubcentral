'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { JobForm } from '@/components/jobs/JobForm';
import { redirect } from 'next/navigation';

export default function NewJobPage() {
  const { user, loading } = useAuth();

  // Only owner, admin, pm, or sales_rep can create jobs
  const canCreate =
    user?.role && ['owner', 'admin', 'pm', 'sales_rep'].includes(user.role);

  if (!loading && !canCreate) {
    redirect('/kr');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <JobForm
      defaultSalesRepId={user?.role === 'sales_rep' ? user.uid : undefined}
    />
  );
}

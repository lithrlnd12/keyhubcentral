'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { LeadForm } from '@/components/leads';
import { redirect } from 'next/navigation';

export default function NewLeadPage() {
  const { user, loading } = useAuth();

  // Only owners and admins can create leads
  if (!loading && user?.role && !['owner', 'admin'].includes(user.role)) {
    redirect('/kd');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="h-64 bg-gray-800/50 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-800/50 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return <LeadForm mode="create" />;
}

'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { CampaignForm } from '@/components/campaigns';
import { redirect } from 'next/navigation';

export default function NewCampaignPage() {
  const { user, loading } = useAuth();

  if (!loading && user?.role && !['owner', 'admin'].includes(user.role)) {
    redirect('/kd/campaigns');
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
        <div className="h-96 bg-gray-800/50 rounded-xl animate-pulse" />
      </div>
    );
  }

  return <CampaignForm mode="create" />;
}

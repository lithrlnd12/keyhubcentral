'use client';

import { useParams } from 'next/navigation';
import { useCampaign } from '@/lib/hooks/useCampaign';
import { useAuth } from '@/lib/hooks/useAuth';
import { CampaignForm } from '@/components/campaigns';
import { Spinner } from '@/components/ui/Spinner';
import { redirect } from 'next/navigation';

export default function EditCampaignPage() {
  const params = useParams();
  const id = params.id as string;
  const { user, loading: authLoading } = useAuth();
  const { campaign, loading, error } = useCampaign(id);

  if (!authLoading && user?.role && !['owner', 'admin'].includes(user.role)) {
    redirect(`/kd/campaigns/${id}`);
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

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Campaign not found</p>
      </div>
    );
  }

  return <CampaignForm campaign={campaign} mode="edit" />;
}

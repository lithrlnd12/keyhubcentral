'use client';

import { useParams } from 'next/navigation';
import { useCampaign } from '@/lib/hooks/useCampaign';
import { useAuth } from '@/lib/hooks/useAuth';
import { CampaignStats } from '@/components/campaigns';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  CAMPAIGN_PLATFORM_LABELS,
  CAMPAIGN_PLATFORM_COLORS,
  getCampaignStatus,
  CAMPAIGN_STATUS_COLORS,
} from '@/lib/utils/campaigns';
import { formatDate } from '@/lib/utils/formatters';
import { ArrowLeft, Edit, Calendar, MapPin, Wrench } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();
  const { campaign, loading, error } = useCampaign(id);

  const canEdit = user?.role && ['owner', 'admin'].includes(user.role);

  if (loading) {
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

  const status = getCampaignStatus(campaign);
  const statusColors = CAMPAIGN_STATUS_COLORS[status];
  const platformColors = CAMPAIGN_PLATFORM_COLORS[campaign.platform];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/kd/campaigns"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Campaigns
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">{campaign.name}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium',
                  platformColors.bg,
                  platformColors.text
                )}
              >
                {CAMPAIGN_PLATFORM_LABELS[campaign.platform]}
              </span>
              <span
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs font-medium border',
                  statusColors.bg,
                  statusColors.text,
                  statusColors.border
                )}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          </div>

          {canEdit && (
            <Link href={`/kd/campaigns/${campaign.id}/edit`}>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <CampaignStats campaign={campaign} />

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400">Duration</p>
                <p className="text-white">
                  {formatDate(campaign.startDate.toDate())}
                  {campaign.endDate
                    ? ` - ${formatDate(campaign.endDate.toDate())}`
                    : ' - Ongoing'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Wrench className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400">Trade</p>
                <p className="text-white">{campaign.trade}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm text-gray-400">Market</p>
                <p className="text-white">{campaign.market}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

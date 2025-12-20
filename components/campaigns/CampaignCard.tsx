'use client';

import Link from 'next/link';
import { Campaign } from '@/types/lead';
import { Card, CardContent } from '@/components/ui/Card';
import {
  CAMPAIGN_PLATFORM_LABELS,
  CAMPAIGN_PLATFORM_COLORS,
  getCampaignStatus,
  CAMPAIGN_STATUS_COLORS,
  calculateCPL,
} from '@/lib/utils/campaigns';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  Calendar,
  DollarSign,
  Users,
  TrendingUp,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface CampaignCardProps {
  campaign: Campaign;
  className?: string;
}

export function CampaignCard({ campaign, className }: CampaignCardProps) {
  const status = getCampaignStatus(campaign);
  const statusColors = CAMPAIGN_STATUS_COLORS[status];
  const platformColors = CAMPAIGN_PLATFORM_COLORS[campaign.platform];
  const cpl = calculateCPL(campaign);

  return (
    <Link href={`/kd/campaigns/${campaign.id}`}>
      <Card
        className={cn(
          'hover:border-brand-gold/50 transition-colors cursor-pointer',
          className
        )}
      >
        <CardContent className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <h3 className="text-white font-semibold truncate">{campaign.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    platformColors.bg,
                    platformColors.text
                  )}
                >
                  {CAMPAIGN_PLATFORM_LABELS[campaign.platform]}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-medium border',
                    statusColors.bg,
                    statusColors.text,
                    statusColors.border
                  )}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
          </div>

          {/* Details */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-400">
                {formatDate(campaign.startDate.toDate())}
                {campaign.endDate && ` - ${formatDate(campaign.endDate.toDate())}`}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              {campaign.trade} • {campaign.market}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-700/50">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                <DollarSign className="w-3.5 h-3.5" />
                Spend
              </div>
              <p className="text-white font-semibold">{formatCurrency(campaign.spend)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                <Users className="w-3.5 h-3.5" />
                Leads
              </div>
              <p className="text-white font-semibold">{campaign.leadsGenerated}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
                <TrendingUp className="w-3.5 h-3.5" />
                CPL
              </div>
              <p className={cn(
                'font-semibold',
                cpl > 100 ? 'text-red-400' : cpl > 50 ? 'text-yellow-400' : 'text-green-400'
              )}>
                {formatCurrency(cpl)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

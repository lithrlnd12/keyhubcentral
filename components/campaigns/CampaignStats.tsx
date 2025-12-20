'use client';

import { Campaign } from '@/types/lead';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { calculateCPL, getCampaignStatus, CAMPAIGN_STATUS_COLORS } from '@/lib/utils/campaigns';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  DollarSign,
  Users,
  TrendingUp,
  Calendar,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface CampaignStatsProps {
  campaign: Campaign;
  className?: string;
}

export function CampaignStats({ campaign, className }: CampaignStatsProps) {
  const cpl = calculateCPL(campaign);
  const status = getCampaignStatus(campaign);
  const statusColors = CAMPAIGN_STATUS_COLORS[status];

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Spend</p>
              <p className="text-xl font-bold text-white">
                {formatCurrency(campaign.spend)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Leads Generated</p>
              <p className="text-xl font-bold text-white">
                {campaign.leadsGenerated}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', cpl > 100 ? 'bg-red-500/20' : cpl > 50 ? 'bg-yellow-500/20' : 'bg-green-500/20')}>
              <TrendingUp className={cn('w-6 h-6', cpl > 100 ? 'text-red-400' : cpl > 50 ? 'text-yellow-400' : 'text-green-400')} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Cost Per Lead</p>
              <p className={cn(
                'text-xl font-bold',
                cpl > 100 ? 'text-red-400' : cpl > 50 ? 'text-yellow-400' : 'text-green-400'
              )}>
                {formatCurrency(cpl)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', statusColors.bg)}>
              <Target className={cn('w-6 h-6', statusColors.text)} />
            </div>
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <p className={cn('text-xl font-bold capitalize', statusColors.text)}>
                {status}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

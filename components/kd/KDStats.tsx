'use client';

import { Lead, Campaign, Subscription } from '@/types/lead';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/formatters';
import { getLeadCountSummary, calculateConversionRate } from '@/lib/utils/leads';
import { getCampaignSummary } from '@/lib/utils/campaigns';
import { getSubscriptionSummary } from '@/lib/utils/subscriptions';
import {
  Users,
  TrendingUp,
  DollarSign,
  Megaphone,
  Building2,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

interface KDStatsProps {
  leads: Lead[];
  campaigns: Campaign[];
  subscriptions: Subscription[];
  className?: string;
}

export function KDStats({
  leads,
  campaigns,
  subscriptions,
  className,
}: KDStatsProps) {
  const leadSummary = getLeadCountSummary(leads);
  const campaignSummary = getCampaignSummary(campaigns);
  const subscriptionSummary = getSubscriptionSummary(subscriptions);
  const conversionRate = calculateConversionRate(leads);

  return (
    <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-4', className)}>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand-gold/20">
              <Users className="w-6 h-6 text-brand-gold" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{leadSummary.total}</p>
              <p className="text-sm text-gray-400">Total Leads</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-400">{conversionRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-400">Conversion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <DollarSign className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {formatCurrency(subscriptionSummary.mrr)}
              </p>
              <p className="text-sm text-gray-400">MRR</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-400">
                {formatCurrency(campaignSummary.avgCPL)}
              </p>
              <p className="text-sm text-gray-400">Avg CPL</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

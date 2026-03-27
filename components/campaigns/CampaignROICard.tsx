'use client';

import { CampaignMetrics } from '@/lib/utils/campaignMetrics';
import { Card, CardContent } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/cn';
import {
  DollarSign,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  ShoppingCart,
  CalendarCheck,
} from 'lucide-react';

interface CampaignROICardProps {
  metrics: CampaignMetrics;
  className?: string;
}

function formatMetric(value: number, isCurrency = true): string {
  if (value === 0) return 'N/A';
  return isCurrency ? formatCurrency(value) : value.toString();
}

function formatROI(roi: number | null): string {
  if (roi === null) return 'N/A';
  return `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
}

export function CampaignROICard({ metrics, className }: CampaignROICardProps) {
  const roiColor = metrics.roi === null
    ? 'text-gray-400'
    : metrics.roi >= 0
      ? 'text-green-400'
      : 'text-red-400';

  const roiBgColor = metrics.roi === null
    ? 'bg-gray-500/20'
    : metrics.roi >= 0
      ? 'bg-green-500/20'
      : 'bg-red-500/20';

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {/* Cost Per Lead */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Cost Per Lead</p>
              <p className="text-xl font-bold text-white">
                {formatMetric(metrics.cpl)}
              </p>
              <p className="text-xs text-gray-500">{metrics.totalLeads} leads</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Per Appointment */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <CalendarCheck className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Cost Per Appointment</p>
              <p className="text-xl font-bold text-white">
                {formatMetric(metrics.cpa)}
              </p>
              <p className="text-xs text-gray-500">{metrics.appointmentsGenerated} appts</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Per Sale */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <ShoppingCart className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Cost Per Sale</p>
              <p className="text-xl font-bold text-white">
                {formatMetric(metrics.cps)}
              </p>
              <p className="text-xs text-gray-500">{metrics.salesGenerated} sales</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ROI */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', roiBgColor)}>
              {metrics.roi !== null && metrics.roi >= 0 ? (
                <TrendingUp className={cn('w-6 h-6', roiColor)} />
              ) : (
                <TrendingDown className={cn('w-6 h-6', roiColor)} />
              )}
            </div>
            <div>
              <p className="text-sm text-gray-400">ROI</p>
              <p className={cn('text-xl font-bold', roiColor)}>
                {formatROI(metrics.roi)}
              </p>
              <p className="text-xs text-gray-500">
                {formatCurrency(metrics.revenueAttributed)} revenue
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

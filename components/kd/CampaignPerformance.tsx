'use client';

import { Campaign } from '@/types/lead';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { calculateCPL, CAMPAIGN_PLATFORM_LABELS } from '@/lib/utils/campaigns';
import { formatCurrency } from '@/lib/utils/formatters';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface CampaignPerformanceProps {
  campaigns: Campaign[];
  className?: string;
}

export function CampaignPerformance({ campaigns, className }: CampaignPerformanceProps) {
  // Sort by leads generated, take top 5
  const topCampaigns = [...campaigns]
    .sort((a, b) => b.leadsGenerated - a.leadsGenerated)
    .slice(0, 5);

  if (campaigns.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Top Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-4">No campaigns yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Top Campaigns</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-700">
                <th className="pb-2 font-medium">Campaign</th>
                <th className="pb-2 font-medium text-right">Leads</th>
                <th className="pb-2 font-medium text-right">Spend</th>
                <th className="pb-2 font-medium text-right">CPL</th>
              </tr>
            </thead>
            <tbody>
              {topCampaigns.map((campaign) => {
                const cpl = calculateCPL(campaign);

                return (
                  <tr key={campaign.id} className="border-b border-gray-700/50">
                    <td className="py-3">
                      <Link
                        href={`/kd/campaigns/${campaign.id}`}
                        className="text-white hover:text-brand-gold transition-colors"
                      >
                        <p className="font-medium truncate max-w-[150px]">{campaign.name}</p>
                        <p className="text-xs text-gray-500">
                          {CAMPAIGN_PLATFORM_LABELS[campaign.platform]}
                        </p>
                      </Link>
                    </td>
                    <td className="py-3 text-right text-white">{campaign.leadsGenerated}</td>
                    <td className="py-3 text-right text-gray-400">
                      {formatCurrency(campaign.spend)}
                    </td>
                    <td className={cn(
                      'py-3 text-right font-medium',
                      cpl > 100 ? 'text-red-400' : cpl > 50 ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {formatCurrency(cpl)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

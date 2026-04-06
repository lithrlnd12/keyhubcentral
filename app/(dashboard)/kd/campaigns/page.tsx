'use client';

import { useState, useEffect } from 'react';
import { useCampaigns } from '@/lib/hooks/useCampaigns';
import { useAuth } from '@/lib/hooks/useAuth';
import { CampaignList } from '@/components/campaigns';
import { CampaignROICard } from '@/components/campaigns/CampaignROICard';
import {
  CampaignComparisonChart,
  CampaignComparisonData,
} from '@/components/campaigns/CampaignComparisonChart';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { getCampaignSummary } from '@/lib/utils/campaigns';
import { CampaignMetrics } from '@/lib/utils/campaignMetrics';
import { getAllCampaignMetrics } from '@/lib/firebase/campaigns';
import { formatCurrency } from '@/lib/utils/formatters';
import {
  Plus,
  Megaphone,
  DollarSign,
  Users,
  TrendingUp,
  ArrowLeft,
  BarChart3,
} from 'lucide-react';
import Link from 'next/link';

export default function CampaignsPage() {
  const { user } = useAuth();
  const { campaigns, loading, error } = useCampaigns({ realtime: true });
  const [metricsMap, setMetricsMap] = useState<Map<string, CampaignMetrics>>(new Map());
  const [metricsLoading, setMetricsLoading] = useState(false);

  const summary = getCampaignSummary(campaigns);
  const canCreate = user?.role && ['owner', 'admin'].includes(user.role);

  // Fetch full metrics when campaigns are loaded
  useEffect(() => {
    if (campaigns.length === 0) {
      setMetricsMap(new Map());
      return;
    }

    let cancelled = false;
    setMetricsLoading(true);

    getAllCampaignMetrics(campaigns)
      .then((map) => {
        if (!cancelled) {
          setMetricsMap(map);
        }
      })
      .catch((err) => {
        console.error('Failed to load campaign metrics:', err);
      })
      .finally(() => {
        if (!cancelled) setMetricsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [campaigns]);

  // Aggregate metrics across all campaigns
  const aggregatedMetrics: CampaignMetrics = {
    cpl: 0,
    cpa: 0,
    cps: 0,
    roi: null,
    totalLeads: 0,
    appointmentsGenerated: 0,
    salesGenerated: 0,
    revenueAttributed: 0,
  };

  let totalSpend = 0;
  metricsMap.forEach((m, campaignId) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (campaign) {
      totalSpend += campaign.spend;
    }
    aggregatedMetrics.totalLeads += m.totalLeads;
    aggregatedMetrics.appointmentsGenerated += m.appointmentsGenerated;
    aggregatedMetrics.salesGenerated += m.salesGenerated;
    aggregatedMetrics.revenueAttributed += m.revenueAttributed;
  });

  if (aggregatedMetrics.totalLeads > 0) {
    aggregatedMetrics.cpl = totalSpend / aggregatedMetrics.totalLeads;
  }
  if (aggregatedMetrics.appointmentsGenerated > 0) {
    aggregatedMetrics.cpa = totalSpend / aggregatedMetrics.appointmentsGenerated;
  }
  if (aggregatedMetrics.salesGenerated > 0) {
    aggregatedMetrics.cps = totalSpend / aggregatedMetrics.salesGenerated;
  }
  if (totalSpend > 0) {
    aggregatedMetrics.roi =
      ((aggregatedMetrics.revenueAttributed - totalSpend) / totalSpend) * 100;
  }

  // Build comparison chart data
  const comparisonData: CampaignComparisonData[] = campaigns
    .filter((c) => metricsMap.has(c.id))
    .map((c) => {
      const m = metricsMap.get(c.id)!;
      return {
        name: c.name,
        roi: m.roi,
        spend: c.spend,
        revenue: m.revenueAttributed,
      };
    })
    .filter((d) => d.spend > 0 || d.revenue > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/kd"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KD
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaigns</h1>
            <p className="text-gray-400 mt-1">Manage marketing campaigns and track performance</p>
          </div>
          {canCreate && (
            <Link href="/kd/campaigns/new">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Basic Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-brand-gold" />
            <div>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
              <p className="text-sm text-gray-400">Total Campaigns</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(summary.totalSpend)}
              </p>
              <p className="text-sm text-gray-400">Total Spend</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-blue-400">{summary.totalLeads}</p>
              <p className="text-sm text-gray-400">Leads Generated</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {formatCurrency(summary.avgCPL)}
              </p>
              <p className="text-sm text-gray-400">Avg CPL</p>
            </div>
          </div>
        </div>
      </div>

      {/* ROI Metrics (from full calculation) */}
      {!metricsLoading && metricsMap.size > 0 && (
        <>
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">ROI Metrics (All Campaigns)</h2>
            <CampaignROICard metrics={aggregatedMetrics} />
          </div>

          {/* Campaign Comparison Chart */}
          {comparisonData.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-brand-gold" />
                  <CardTitle>Campaign Comparison: Spend vs Revenue</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CampaignComparisonChart data={comparisonData} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {metricsLoading && (
        <div className="text-center text-gray-400 py-4">Loading ROI metrics...</div>
      )}

      {/* Campaign List */}
      <CampaignList
        campaigns={campaigns}
        loading={loading}
        error={error}
        showAddButton={canCreate}
        emptyMessage="No campaigns yet. Create your first campaign to start tracking performance."
      />
    </div>
  );
}

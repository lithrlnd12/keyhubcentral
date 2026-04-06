'use client';

import { useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  DollarSign,
  BarChart3,
  Target,
  AlertTriangle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/formatters';
import { HistoricalPoint, ForecastPoint, calculateTrend } from '@/lib/ai/forecasting';
import { ConversionRate, PipelineResult } from '@/lib/ai/predictions';

interface PredictiveInsightsPanelProps {
  revenueHistory: HistoricalPoint[];
  revenueForecast: ForecastPoint[];
  leadHistory: HistoricalPoint[];
  installerForecast: ForecastPoint[];
  installerCapacity: number;
  conversionRates: ConversionRate[];
  pipelineValue: PipelineResult;
}

type InsightSeverity = 'positive' | 'caution' | 'warning';

interface Insight {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  severity: InsightSeverity;
}

const severityStyles: Record<InsightSeverity, { border: string; iconBg: string; text: string }> = {
  positive: {
    border: 'border-green-500/30',
    iconBg: 'bg-green-500/15 text-green-400',
    text: 'text-green-400',
  },
  caution: {
    border: 'border-yellow-500/30',
    iconBg: 'bg-yellow-500/15 text-yellow-400',
    text: 'text-yellow-400',
  },
  warning: {
    border: 'border-red-500/30',
    iconBg: 'bg-red-500/15 text-red-400',
    text: 'text-red-400',
  },
};

export function PredictiveInsightsPanel({
  revenueHistory,
  revenueForecast,
  leadHistory,
  installerForecast,
  installerCapacity,
  conversionRates,
  pipelineValue,
}: PredictiveInsightsPanelProps) {
  const insights = useMemo(() => {
    const items: Insight[] = [];

    // 1. Revenue trend insight
    if (revenueHistory.length >= 2) {
      const trend = calculateTrend(revenueHistory);
      const nextForecast = revenueForecast[0];

      if (trend === 'up') {
        items.push({
          id: 'revenue-trend',
          icon: <TrendingUp className="w-5 h-5" />,
          title: 'Revenue Trending Up',
          description: nextForecast
            ? `Projected ${formatCurrency(nextForecast.predicted)} next month (range: ${formatCurrency(nextForecast.confidenceLow)} - ${formatCurrency(nextForecast.confidenceHigh)}).`
            : 'Revenue has been increasing over recent periods.',
          severity: 'positive',
        });
      } else if (trend === 'down') {
        items.push({
          id: 'revenue-trend',
          icon: <TrendingDown className="w-5 h-5" />,
          title: 'Revenue Trending Down',
          description: nextForecast
            ? `Projected ${formatCurrency(nextForecast.predicted)} next month. Consider reviewing sales pipeline and marketing spend.`
            : 'Revenue has been declining over recent periods.',
          severity: 'warning',
        });
      } else {
        items.push({
          id: 'revenue-trend',
          icon: <Minus className="w-5 h-5" />,
          title: 'Revenue Holding Steady',
          description: nextForecast
            ? `Projected ${formatCurrency(nextForecast.predicted)} next month. Revenue is relatively flat.`
            : 'Revenue has been stable over recent periods.',
          severity: 'caution',
        });
      }
    }

    // 2. Lead volume comparison (current vs previous period)
    if (leadHistory.length >= 2) {
      const current = leadHistory[leadHistory.length - 1].value;
      const previous = leadHistory[leadHistory.length - 2].value;

      if (previous > 0) {
        const changePct = Math.round(((current - previous) / previous) * 100);
        if (changePct > 0) {
          items.push({
            id: 'lead-volume',
            icon: <Zap className="w-5 h-5" />,
            title: 'Lead Volume Increasing',
            description: `Lead volume is ${changePct}% higher than the previous period (${current} vs ${previous}).`,
            severity: 'positive',
          });
        } else if (changePct < -10) {
          items.push({
            id: 'lead-volume',
            icon: <BarChart3 className="w-5 h-5" />,
            title: 'Lead Volume Declining',
            description: `Lead volume is ${Math.abs(changePct)}% lower than the previous period (${current} vs ${previous}).`,
            severity: 'warning',
          });
        } else {
          items.push({
            id: 'lead-volume',
            icon: <BarChart3 className="w-5 h-5" />,
            title: 'Lead Volume Stable',
            description: `Lead volume changed ${changePct >= 0 ? '+' : ''}${changePct}% from the previous period (${current} vs ${previous}).`,
            severity: 'caution',
          });
        }
      }
    }

    // 3. Installer capacity warning
    if (installerForecast.length > 0) {
      const tightMonths = installerForecast.filter(
        (f) => f.predicted > installerCapacity
      );
      if (tightMonths.length > 0) {
        const firstTight = tightMonths[0];
        items.push({
          id: 'installer-capacity',
          icon: <AlertTriangle className="w-5 h-5" />,
          title: 'Installer Capacity Alert',
          description: `Installer capacity will be tight in ${firstTight.period} (forecasted ${Math.round(firstTight.predicted)} jobs vs ${installerCapacity} capacity). Consider hiring additional installers.`,
          severity: 'warning',
        });
      } else {
        items.push({
          id: 'installer-capacity',
          icon: <Users className="w-5 h-5" />,
          title: 'Installer Capacity Sufficient',
          description: `Current installer capacity (${installerCapacity} jobs/period) can handle forecasted demand.`,
          severity: 'positive',
        });
      }
    }

    // 4. Best performing lead source
    if (conversionRates.length > 0) {
      const best = conversionRates[0]; // already sorted by rate desc
      if (best.total >= 3) {
        items.push({
          id: 'best-source',
          icon: <Target className="w-5 h-5" />,
          title: 'Top Performing Lead Source',
          description: `Best performing lead source: ${formatSourceLabel(best.group)} at ${best.rate.toFixed(1)}% conversion rate (${best.converted}/${best.total} leads).`,
          severity: 'positive',
        });
      }
    }

    // 5. Pipeline value
    if (pipelineValue.activeLeadCount > 0) {
      const severity: InsightSeverity =
        pipelineValue.totalValue > 0 ? 'positive' : 'caution';
      items.push({
        id: 'pipeline-value',
        icon: <DollarSign className="w-5 h-5" />,
        title: 'Pipeline Value',
        description: `Weighted pipeline value: ${formatCurrency(pipelineValue.totalValue)} across ${pipelineValue.activeLeadCount} active lead${pipelineValue.activeLeadCount === 1 ? '' : 's'}.`,
        severity,
      });
    }

    // Ensure at least one insight
    if (items.length === 0) {
      items.push({
        id: 'no-data',
        icon: <CheckCircle className="w-5 h-5" />,
        title: 'Getting Started',
        description:
          'Add more historical data to unlock predictive insights. At least 3 periods of revenue, lead, and job data are needed.',
        severity: 'caution',
      });
    }

    return items;
  }, [
    revenueHistory,
    revenueForecast,
    leadHistory,
    installerForecast,
    installerCapacity,
    conversionRates,
    pipelineValue,
  ]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {insights.map((insight) => {
        const style = severityStyles[insight.severity];
        return (
          <div
            key={insight.id}
            className={`rounded-lg border p-4 transition-colors ${style.border} bg-gray-900/50`}
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-lg p-2 flex-shrink-0 ${style.iconBg}`}>
                {insight.icon}
              </div>
              <div className="min-w-0">
                <h4 className={`text-sm font-semibold ${style.text}`}>
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  {insight.description}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    google_ads: 'Google Ads',
    meta: 'Meta',
    tiktok: 'TikTok',
    referral: 'Referral',
    event: 'Event',
    customer_portal: 'Customer Portal',
    other: 'Other',
  };
  return labels[source] || source;
}

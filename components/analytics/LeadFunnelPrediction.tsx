'use client';

import { useMemo } from 'react';
import { Lead } from '@/types/lead';
import { getConversionRateBySource } from '@/lib/ai/predictions';

interface LeadFunnelPredictionProps {
  leads: Lead[];
}

interface FunnelStage {
  key: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
  bgColor: string;
}

const FUNNEL_STAGES = [
  { key: 'new', label: 'New', color: '#3B82F6', bgColor: 'bg-blue-500/20' },
  { key: 'contacted', label: 'Contacted', color: '#8B5CF6', bgColor: 'bg-violet-500/20' },
  { key: 'qualified', label: 'Qualified', color: '#F59E0B', bgColor: 'bg-amber-500/20' },
  { key: 'converted', label: 'Converted', color: '#22C55E', bgColor: 'bg-green-500/20' },
];

export function LeadFunnelPrediction({ leads }: LeadFunnelPredictionProps) {
  const funnelData = useMemo(() => {
    if (!leads || leads.length === 0) return [];

    // Count leads at each funnel stage
    // "assigned" leads count as "new" since they have not been contacted yet
    const stageCounts: Record<string, number> = {
      new: 0,
      contacted: 0,
      qualified: 0,
      converted: 0,
    };

    for (const lead of leads) {
      if (!lead) continue;
      const status = lead.status;
      if (status === 'new' || status === 'assigned') {
        stageCounts['new']++;
      } else if (status === 'contacted') {
        stageCounts['contacted']++;
      } else if (status === 'qualified') {
        stageCounts['qualified']++;
      } else if (status === 'converted') {
        stageCounts['converted']++;
      }
      // lost and returned are excluded from the funnel
    }

    // Build cumulative counts (each stage includes leads that have passed through it)
    const cumulativeCounts = {
      new: stageCounts.new + stageCounts.contacted + stageCounts.qualified + stageCounts.converted,
      contacted: stageCounts.contacted + stageCounts.qualified + stageCounts.converted,
      qualified: stageCounts.qualified + stageCounts.converted,
      converted: stageCounts.converted,
    };

    const topCount = cumulativeCounts.new || 1;

    return FUNNEL_STAGES.map((stage) => ({
      ...stage,
      count: cumulativeCounts[stage.key as keyof typeof cumulativeCounts] || 0,
      percentage: Math.round(
        ((cumulativeCounts[stage.key as keyof typeof cumulativeCounts] || 0) / topCount) * 100
      ),
    }));
  }, [leads]);

  const conversionRates = useMemo(() => {
    return getConversionRateBySource(leads || []);
  }, [leads]);

  if (!leads || leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-[280px] text-gray-500">
        No lead data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Funnel visualization */}
      <div className="space-y-3">
        {funnelData.map((stage, index) => {
          const widthPct = Math.max(stage.percentage, 8); // minimum width for visibility
          return (
            <div key={stage.key} className="relative">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400 font-medium">{stage.label}</span>
                <span className="text-white tabular-nums">
                  {stage.count}
                  <span className="text-gray-500 text-xs ml-1">
                    ({stage.percentage}%)
                  </span>
                </span>
              </div>
              <div className="relative h-8 bg-gray-800/50 rounded-md overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 rounded-md transition-all duration-700 ease-out flex items-center justify-center"
                  style={{
                    width: `${widthPct}%`,
                    backgroundColor: stage.color,
                    opacity: 0.85,
                    transitionDelay: `${index * 100}ms`,
                  }}
                >
                  {widthPct > 20 && (
                    <span className="text-xs font-medium text-white drop-shadow-sm">
                      {stage.count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stage-to-stage conversion rates */}
      {funnelData.length >= 2 && (
        <div className="border-t border-gray-700/50 pt-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">
            Stage Conversion Rates
          </p>
          <div className="grid grid-cols-3 gap-2">
            {funnelData.slice(0, -1).map((stage, i) => {
              const nextStage = funnelData[i + 1];
              const rate =
                stage.count > 0
                  ? Math.round((nextStage.count / stage.count) * 100)
                  : 0;
              return (
                <div
                  key={stage.key}
                  className="bg-gray-800/30 rounded-md p-2 text-center"
                >
                  <div className="text-xs text-gray-500 truncate">
                    {stage.label} &rarr; {nextStage.label}
                  </div>
                  <div
                    className="text-lg font-bold mt-1"
                    style={{ color: nextStage.color }}
                  >
                    {rate}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

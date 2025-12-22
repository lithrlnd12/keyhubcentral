'use client';

import { useMemo } from 'react';
import { ArrowRight, ArrowDown, Users, Target, Building2, Wrench, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowNodeProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'blue' | 'gold';
  stats?: { label: string; value: string }[];
}

function FlowNode({ title, subtitle, icon, color, stats }: FlowNodeProps) {
  const colorClasses = {
    purple: 'border-purple-500/30 bg-purple-500/10',
    green: 'border-green-500/30 bg-green-500/10',
    blue: 'border-blue-500/30 bg-blue-500/10',
    gold: 'border-brand-gold/30 bg-brand-gold/10',
  };

  const iconColors = {
    purple: 'text-purple-400',
    green: 'text-green-400',
    blue: 'text-blue-400',
    gold: 'text-brand-gold',
  };

  return (
    <div className={cn('rounded-xl border p-4 min-w-[180px]', colorClasses[color])}>
      <div className="flex items-center gap-3 mb-2">
        <div className={iconColors[color]}>{icon}</div>
        <div>
          <h4 className="font-semibold text-white">{title}</h4>
          <p className="text-xs text-gray-400">{subtitle}</p>
        </div>
      </div>
      {stats && stats.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
          {stats.map((stat, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-400">{stat.label}</span>
              <span className="text-white font-medium">{stat.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface FlowArrowProps {
  direction: 'right' | 'down';
  label?: string;
}

function FlowArrow({ direction, label }: FlowArrowProps) {
  if (direction === 'right') {
    return (
      <div className="flex flex-col items-center justify-center px-2">
        {label && <span className="text-xs text-gray-500 mb-1">{label}</span>}
        <ArrowRight className="w-6 h-6 text-gray-500" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex flex-col items-center">
        <ArrowDown className="w-6 h-6 text-gray-500" />
        {label && <span className="text-xs text-gray-500 mt-1">{label}</span>}
      </div>
    </div>
  );
}

export interface BusinessFlowStats {
  kd: {
    leadsGenerated: number;
    activeCampaigns: number;
    conversionRate: number;
  };
  kts: {
    activeContractors: number;
    jobsCompleted: number;
    avgRating: number;
  };
  kr: {
    activeJobs: number;
    revenue: number;
    avgJobValue: number;
  };
}

interface BusinessFlowDiagramProps {
  stats?: BusinessFlowStats;
  compact?: boolean;
}

export function BusinessFlowDiagram({ stats, compact = false }: BusinessFlowDiagramProps) {
  const kdStats = useMemo(() => {
    if (!stats) return undefined;
    return [
      { label: 'Leads', value: String(stats.kd.leadsGenerated) },
      { label: 'Campaigns', value: String(stats.kd.activeCampaigns) },
    ];
  }, [stats]);

  const ktsStats = useMemo(() => {
    if (!stats) return undefined;
    return [
      { label: 'Contractors', value: String(stats.kts.activeContractors) },
      { label: 'Avg Rating', value: stats.kts.avgRating.toFixed(1) },
    ];
  }, [stats]);

  const krStats = useMemo(() => {
    if (!stats) return undefined;
    return [
      { label: 'Active Jobs', value: String(stats.kr.activeJobs) },
      { label: 'Avg Value', value: `$${(stats.kr.avgJobValue / 1000).toFixed(0)}k` },
    ];
  }, [stats]);

  if (compact) {
    return (
      <div className="flex flex-col gap-4">
        {/* Compact view for smaller screens */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-lg px-3 py-2">
            <Target className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-white">KD</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-500" />
          <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
            <Building2 className="w-4 h-4 text-green-400" />
            <span className="text-sm text-white">KR</span>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-500" />
          <div className="flex items-center gap-2 bg-brand-gold/10 border border-brand-gold/30 rounded-lg px-3 py-2">
            <DollarSign className="w-4 h-4 text-brand-gold" />
            <span className="text-sm text-white">Revenue</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2">
            <Wrench className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-white">KTS</span>
          </div>
          <span className="text-xs text-gray-500">provides labor to KR</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Main Flow: KD → KR → Revenue */}
      <div className="flex flex-col items-center gap-4">
        {/* Top row: Lead generation flow */}
        <div className="flex items-center gap-4 flex-wrap justify-center">
          <FlowNode
            title="Keynote Digital"
            subtitle="Lead Generation"
            icon={<Target className="w-5 h-5" />}
            color="purple"
            stats={kdStats}
          />
          <FlowArrow direction="right" label="Leads" />
          <FlowNode
            title="Key Renovations"
            subtitle="D2C Sales"
            icon={<Building2 className="w-5 h-5" />}
            color="green"
            stats={krStats}
          />
          <FlowArrow direction="right" label="Jobs" />
          <FlowNode
            title="Revenue"
            subtitle="Completed Work"
            icon={<DollarSign className="w-5 h-5" />}
            color="gold"
            stats={stats ? [
              { label: 'MTD', value: `$${(stats.kr.revenue / 1000).toFixed(0)}k` },
            ] : undefined}
          />
        </div>

        {/* KTS connection */}
        <div className="flex items-start gap-4 mt-4">
          <div className="w-[180px]" /> {/* Spacer for alignment */}
          <div className="flex flex-col items-center">
            <div className="h-8 border-l border-dashed border-gray-600" />
            <FlowNode
              title="Key Trade Solutions"
              subtitle="Contractor Network"
              icon={<Wrench className="w-5 h-5" />}
              color="blue"
              stats={ktsStats}
            />
            <div className="mt-2 text-xs text-gray-500 text-center">
              Provides skilled labor to KR jobs
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-800 w-full">
          <h5 className="text-sm font-medium text-gray-400 mb-3">How It Works</h5>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5" />
              <span className="text-gray-400">
                <strong className="text-white">KD</strong> generates leads via digital marketing campaigns
              </span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5" />
              <span className="text-gray-400">
                <strong className="text-white">KR</strong> converts leads into renovation jobs
              </span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
              <span className="text-gray-400">
                <strong className="text-white">KTS</strong> supplies contractors to execute the work
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

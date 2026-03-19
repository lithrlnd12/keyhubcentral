'use client';

import type { Lead } from '@/types/lead';

interface LeadPipelineChartProps {
  leads: Lead[];
}

const STAGES: { key: string; label: string; barColor: string; }[] = [
  { key: 'new', label: 'New', barColor: '#3B82F6' },
  { key: 'assigned', label: 'Assigned', barColor: '#6366F1' },
  { key: 'contacted', label: 'Contacted', barColor: '#A855F7' },
  { key: 'qualified', label: 'Qualified', barColor: '#F59E0B' },
  { key: 'converted', label: 'Converted', barColor: '#22C55E' },
  { key: 'lost', label: 'Lost', barColor: '#EF4444' },
  { key: 'returned', label: 'Returned', barColor: '#6B7280' },
];

export function LeadPipelineChart({ leads }: LeadPipelineChartProps) {
  if (!leads || leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500">
        No leads yet
      </div>
    );
  }

  const counts: Record<string, number> = {};
  leads.forEach((lead) => {
    const status = lead?.status || 'new';
    counts[status] = (counts[status] || 0) + 1;
  });

  const total = leads.length;
  const activeStages = STAGES.filter((s) => counts[s.key]);

  if (activeStages.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500">
        No leads yet
      </div>
    );
  }

  const maxCount = Math.max(...activeStages.map((s) => counts[s.key] || 0));

  return (
    <div className="space-y-3 py-2">
      {activeStages.map((stage) => {
        const count = counts[stage.key] || 0;
        const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
        return (
          <div key={stage.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{stage.label}</span>
              <span className="text-white font-medium tabular-nums">
                {count}
                <span className="text-gray-500 text-xs ml-1">
                  ({((count / total) * 100).toFixed(0)}%)
                </span>
              </span>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: stage.barColor }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

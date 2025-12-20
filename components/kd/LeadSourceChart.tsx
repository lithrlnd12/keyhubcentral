'use client';

import { Lead, LeadSource } from '@/types/lead';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { groupLeadsBySource, LEAD_SOURCE_LABELS, LEAD_SOURCE_COLORS } from '@/lib/utils/leads';
import { cn } from '@/lib/utils/cn';

interface LeadSourceChartProps {
  leads: Lead[];
  className?: string;
}

export function LeadSourceChart({ leads, className }: LeadSourceChartProps) {
  const grouped = groupLeadsBySource(leads);
  const total = leads.length;

  // Get sources with leads, sorted by count
  const sourcesWithLeads = (Object.entries(grouped) as [LeadSource, Lead[]][])
    .filter(([, sourceLeads]) => sourceLeads.length > 0)
    .sort((a, b) => b[1].length - a[1].length);

  if (total === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Leads by Source</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-4">No lead data yet</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Leads by Source</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sourcesWithLeads.map(([source, sourceLeads]) => {
            const percentage = (sourceLeads.length / total) * 100;
            const colors = LEAD_SOURCE_COLORS[source];

            return (
              <div key={source}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-300">{LEAD_SOURCE_LABELS[source]}</span>
                  <span className={colors.text}>
                    {sourceLeads.length} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', colors.bg.replace('/20', ''))}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

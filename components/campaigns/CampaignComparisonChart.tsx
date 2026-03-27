'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/formatters';

export interface CampaignComparisonData {
  name: string;
  roi: number | null;
  spend: number;
  revenue: number;
}

interface CampaignComparisonChartProps {
  data: CampaignComparisonData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !Array.isArray(payload) || !payload.length) return null;

  return (
    <div className="bg-brand-black border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry?.color || '#6B7280' }}
          />
          <span className="text-gray-400">{entry?.name || 'Unknown'}:</span>
          <span className="text-white">
            {entry?.name === 'ROI'
              ? `${(entry?.value ?? 0).toFixed(1)}%`
              : formatCurrency(entry?.value || 0)}
          </span>
        </div>
      ))}
    </div>
  );
};

const CustomLegend = ({ payload }: any) => {
  if (!payload || !Array.isArray(payload)) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 pt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry?.color || '#6B7280' }}
          />
          <span className="text-gray-400 text-sm">{entry?.value || 'Unknown'}</span>
        </div>
      ))}
    </div>
  );
};

export function CampaignComparisonChart({ data }: CampaignComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-gray-500">
        No campaign data available for comparison
      </div>
    );
  }

  // Prepare chart data: use spend vs revenue as grouped bars
  const chartData = data.map((d) => ({
    name: d.name.length > 15 ? d.name.slice(0, 15) + '...' : d.name,
    fullName: d.name,
    Spend: d.spend,
    Revenue: d.revenue,
    ROI: d.roi ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#9CA3AF', fontSize: 11 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={false}
          interval={0}
          angle={data.length > 5 ? -30 : 0}
          textAnchor={data.length > 5 ? 'end' : 'middle'}
          height={data.length > 5 ? 60 : 30}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={false}
          tickFormatter={(value) =>
            value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
        <Legend content={<CustomLegend />} />
        <Bar dataKey="Spend" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={40} name="Spend" />
        <Bar dataKey="Revenue" radius={[4, 4, 0, 0]} maxBarSize={40} name="Revenue">
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.Revenue >= entry.Spend ? '#22C55E' : '#F59E0B'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

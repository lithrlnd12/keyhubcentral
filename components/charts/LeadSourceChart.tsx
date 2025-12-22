'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { LeadSourceData } from '@/lib/utils/dashboard';

interface LeadSourceChartProps {
  data: LeadSourceData[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-brand-black border border-gray-700 rounded-lg p-3 shadow-lg">
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color || '#6B7280' }}
        />
        <span className="text-white">{data.name || 'Unknown'}</span>
      </div>
      <p className="text-gray-400 text-sm mt-1">{data.value || 0} leads</p>
    </div>
  );
};

const renderLegend = (props: any) => {
  const { payload } = props;
  if (!payload || !Array.isArray(payload)) return null;

  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
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

export function LeadSourceChart({ data }: LeadSourceChartProps) {
  // Strict validation - return early if data is invalid
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500">
        No lead data available
      </div>
    );
  }

  // Filter out any invalid entries and ensure all have required properties
  const safeData = data
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => ({
      name: String(entry.name || 'Unknown'),
      value: Number(entry.value) || 0,
      color: String(entry.color || '#6B7280'),
    }));

  // Return empty state if no valid data after filtering
  if (safeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500">
        No lead data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={safeData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={70}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {safeData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend content={renderLegend} />
      </PieChart>
    </ResponsiveContainer>
  );
}

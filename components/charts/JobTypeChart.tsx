'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { JobTypeData } from '@/lib/utils/dashboard';

interface JobTypeChartProps {
  data: JobTypeData[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !Array.isArray(payload) || !payload.length) return null;

  return (
    <div className="bg-brand-black border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium">{label || 'Unknown'}</p>
      <p className="text-brand-gold text-sm">{payload[0]?.value || 0} jobs</p>
    </div>
  );
};

export function JobTypeChart({ data }: JobTypeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-gray-500">
        No job data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(212, 168, 75, 0.1)' }} />
        <Bar
          dataKey="count"
          fill="#D4A84B"
          radius={[4, 4, 0, 0]}
          maxBarSize={50}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

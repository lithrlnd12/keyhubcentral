'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { RevenueDataPoint } from '@/lib/utils/dashboard';
import { formatCurrency } from '@/lib/utils/formatters';

interface RevenueChartProps {
  data: RevenueDataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-brand-black border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-400">{entry.name}:</span>
          <span className="text-white">{formatCurrency(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export function RevenueChart({ data }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorKD" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorKTS" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorKR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ paddingTop: 20 }}
          formatter={(value) => <span className="text-gray-400 text-sm">{value}</span>}
        />
        <Area
          type="monotone"
          dataKey="kd"
          name="Keynote Digital"
          stroke="#8B5CF6"
          fillOpacity={1}
          fill="url(#colorKD)"
          stackId="1"
        />
        <Area
          type="monotone"
          dataKey="kts"
          name="Key Trade Solutions"
          stroke="#3B82F6"
          fillOpacity={1}
          fill="url(#colorKTS)"
          stackId="1"
        />
        <Area
          type="monotone"
          dataKey="kr"
          name="Key Renovations"
          stroke="#10B981"
          fillOpacity={1}
          fill="url(#colorKR)"
          stackId="1"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

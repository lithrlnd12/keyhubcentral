'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ReportResult, ReportConfig } from '@/types/report';
import { getMetricFormat, formatMetricValue } from '@/lib/utils/reportEngine';

interface ReportChartProps {
  result: ReportResult;
  config: ReportConfig;
}

const CHART_COLORS = [
  '#D4AF37', // brand-gold
  '#3B82F6', // blue
  '#10B981', // green
  '#8B5CF6', // purple
  '#F59E0B', // amber
  '#EF4444', // red
  '#06B6D4', // cyan
  '#EC4899', // pink
];

const CustomTooltip = ({ active, payload, label, config }: any) => {
  if (!active || !payload || !Array.isArray(payload)) return null;

  return (
    <div className="bg-brand-black border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => {
        const metric = config?.metrics?.[index];
        const format = metric
          ? getMetricFormat(metric.source, metric.field)
          : 'number';
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry?.color || '#6B7280' }}
            />
            <span className="text-gray-400">{entry?.name || 'Unknown'}:</span>
            <span className="text-white">
              {formatMetricValue(entry?.value || 0, format)}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export function ReportChart({ result, config }: ReportChartProps) {
  const metricLabels = config.metrics.map((m) => m.label);

  // No groupBy — show summary cards instead of chart
  if (!config.groupBy || result.data.length <= 1) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {config.metrics.map((metric, i) => {
          const value = result.totals[metric.label] ?? 0;
          const format = getMetricFormat(metric.source, metric.field);
          return (
            <div
              key={metric.label}
              className="bg-brand-black rounded-lg border border-gray-700 p-4"
            >
              <p className="text-xs text-gray-400 mb-1">{metric.label}</p>
              <p
                className="text-2xl font-bold"
                style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
              >
                {formatMetricValue(value, format)}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  // With groupBy — render bar chart
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={result.data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <XAxis
          dataKey="group"
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
        />
        <YAxis
          tick={{ fill: '#9CA3AF', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          tickLine={{ stroke: '#374151' }}
        />
        <Tooltip content={<CustomTooltip config={config} />} />
        <Legend
          wrapperStyle={{ paddingTop: '16px' }}
          formatter={(value: string) => (
            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>{value}</span>
          )}
        />
        {metricLabels.map((label, i) => (
          <Bar
            key={label}
            dataKey={label}
            name={label}
            fill={CHART_COLORS[i % CHART_COLORS.length]}
            radius={[4, 4, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

'use client';

import {
  LineChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/formatters';
import { HistoricalPoint, ForecastPoint } from '@/lib/ai/forecasting';

interface RevenueForecastChartProps {
  historical: HistoricalPoint[];
  forecast: ForecastPoint[];
}

interface ChartDataPoint {
  period: string;
  actual?: number;
  predicted?: number;
  confidenceLow?: number;
  confidenceHigh?: number;
  confidenceRange?: [number, number];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !Array.isArray(payload)) return null;

  return (
    <div className="bg-brand-black border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => {
        if (entry?.dataKey === 'confidenceRange') {
          const [low, high] = entry.value || [0, 0];
          return (
            <div key={index} className="text-sm text-gray-400">
              95% CI: {formatCurrency(low)} - {formatCurrency(high)}
            </div>
          );
        }
        return (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry?.color || '#6B7280' }}
            />
            <span className="text-gray-400">{entry?.name || 'Unknown'}:</span>
            <span className="text-white">{formatCurrency(entry?.value || 0)}</span>
          </div>
        );
      })}
    </div>
  );
};

const CustomLegend = ({ payload }: any) => {
  if (!payload || !Array.isArray(payload)) return null;

  const legendItems = [
    { label: 'Historical', color: '#3B82F6', dash: false },
    { label: 'Forecast', color: '#F59E0B', dash: true },
    { label: 'Confidence Range', color: '#F59E0B33', dash: false, isArea: true },
  ];

  return (
    <div className="flex flex-wrap justify-center gap-4 pt-4">
      {legendItems.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          {item.isArea ? (
            <div
              className="w-4 h-3 rounded-sm"
              style={{ backgroundColor: '#F59E0B', opacity: 0.2 }}
            />
          ) : (
            <div
              className="w-4 h-0.5"
              style={{
                backgroundColor: item.color,
                borderTop: item.dash ? '2px dashed ' + item.color : '2px solid ' + item.color,
              }}
            />
          )}
          <span className="text-gray-400 text-sm">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

export function RevenueForecastChart({
  historical,
  forecast,
}: RevenueForecastChartProps) {
  if ((!historical || historical.length === 0) && (!forecast || forecast.length === 0)) {
    return (
      <div className="flex items-center justify-center h-[350px] text-gray-500">
        Not enough data for revenue forecast (need at least 3 months)
      </div>
    );
  }

  // Build combined data for the chart
  const chartData: ChartDataPoint[] = [];

  // Historical data points
  for (const point of historical) {
    chartData.push({
      period: point.period,
      actual: point.value,
    });
  }

  // Bridge: last historical point also gets a predicted value for continuity
  if (historical.length > 0 && forecast.length > 0) {
    const lastHistorical = chartData[chartData.length - 1];
    lastHistorical.predicted = lastHistorical.actual;
  }

  // Forecast data points
  for (const point of forecast) {
    chartData.push({
      period: point.period,
      predicted: point.predicted,
      confidenceLow: point.confidenceLow,
      confidenceHigh: point.confidenceHigh,
      confidenceRange: [point.confidenceLow, point.confidenceHigh],
    });
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="period"
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={{ stroke: '#374151' }}
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={{ stroke: '#374151' }}
            tickFormatter={(value) =>
              value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
            }
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Confidence interval as shaded area */}
          <Area
            type="monotone"
            dataKey="confidenceRange"
            fill="url(#confidenceGradient)"
            stroke="none"
            name="Confidence Range"
            legendType="none"
          />

          {/* Historical line (solid) */}
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#3B82F6"
            strokeWidth={2.5}
            dot={{ fill: '#3B82F6', r: 4 }}
            activeDot={{ r: 6, fill: '#3B82F6' }}
            name="Historical"
            connectNulls={false}
          />

          {/* Forecast line (dashed) */}
          <Line
            type="monotone"
            dataKey="predicted"
            stroke="#F59E0B"
            strokeWidth={2.5}
            strokeDasharray="8 4"
            dot={{ fill: '#F59E0B', r: 4, strokeDasharray: '0' }}
            activeDot={{ r: 6, fill: '#F59E0B' }}
            name="Forecast"
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <CustomLegend />
    </div>
  );
}

'use client';

import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Cell,
  ReferenceLine,
} from 'recharts';
import { HistoricalPoint, ForecastPoint } from '@/lib/ai/forecasting';

interface InstallerDemandForecastProps {
  historical: HistoricalPoint[];
  forecast: ForecastPoint[];
  installerCapacity: number; // max jobs per period with current installer count
}

interface ChartDataPoint {
  period: string;
  jobs: number;
  isForecast: boolean;
  capacity: number;
  exceedsCapacity: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !Array.isArray(payload)) return null;

  const jobEntry = payload.find((p: any) => p.dataKey === 'jobs');
  const capacityEntry = payload.find((p: any) => p.dataKey === 'capacity');

  return (
    <div className="bg-brand-black border border-gray-700 rounded-lg p-3 shadow-lg">
      <p className="text-white font-medium mb-2">{label}</p>
      {jobEntry && (
        <div className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: jobEntry.payload?.exceedsCapacity ? '#EF4444' : '#3B82F6' }}
          />
          <span className="text-gray-400">
            {jobEntry.payload?.isForecast ? 'Forecasted Jobs' : 'Actual Jobs'}:
          </span>
          <span className="text-white font-medium">{Math.round(jobEntry.value)}</span>
        </div>
      )}
      {capacityEntry && (
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-emerald-400" />
          <span className="text-gray-400">Installer Capacity:</span>
          <span className="text-white font-medium">{capacityEntry.value}</span>
        </div>
      )}
      {jobEntry?.payload?.exceedsCapacity && (
        <div className="mt-1 text-xs text-red-400 font-medium">
          Demand exceeds capacity
        </div>
      )}
    </div>
  );
};

export function InstallerDemandForecast({
  historical,
  forecast,
  installerCapacity,
}: InstallerDemandForecastProps) {
  if (
    (!historical || historical.length === 0) &&
    (!forecast || forecast.length === 0)
  ) {
    return (
      <div className="flex items-center justify-center h-[280px] text-gray-500">
        Not enough data for installer demand forecast
      </div>
    );
  }

  // Build combined chart data
  const chartData: ChartDataPoint[] = [];

  for (const point of historical) {
    chartData.push({
      period: point.period,
      jobs: point.value,
      isForecast: false,
      capacity: installerCapacity,
      exceedsCapacity: point.value > installerCapacity,
    });
  }

  for (const point of forecast) {
    chartData.push({
      period: point.period,
      jobs: Math.round(point.predicted),
      isForecast: true,
      capacity: installerCapacity,
      exceedsCapacity: point.predicted > installerCapacity,
    });
  }

  const overCapacityCount = chartData.filter(
    (d) => d.isForecast && d.exceedsCapacity
  ).length;

  return (
    <div>
      {overCapacityCount > 0 && (
        <div className="mb-3 flex items-center gap-2 px-1">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm text-red-400">
            {overCapacityCount} period{overCapacityCount > 1 ? 's' : ''} forecast
            to exceed installer capacity
          </span>
        </div>
      )}

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="period"
            tick={{ fill: '#9CA3AF', fontSize: 11 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={{ stroke: '#374151' }}
          />
          <YAxis
            tick={{ fill: '#9CA3AF', fontSize: 12 }}
            axisLine={{ stroke: '#374151' }}
            tickLine={{ stroke: '#374151' }}
            allowDecimals={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Capacity reference line */}
          <ReferenceLine
            y={installerCapacity}
            stroke="#10B981"
            strokeDasharray="6 3"
            strokeWidth={2}
          />

          {/* Jobs bars with conditional coloring */}
          <Bar dataKey="jobs" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.exceedsCapacity
                    ? '#EF4444'
                    : entry.isForecast
                    ? '#F59E0B'
                    : '#3B82F6'
                }
                fillOpacity={entry.isForecast ? 0.7 : 0.9}
              />
            ))}
          </Bar>

          {/* Capacity line overlay */}
          <Line
            type="monotone"
            dataKey="capacity"
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            name="Capacity"
            legendType="none"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 pt-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-gray-400 text-sm">Actual</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-amber-500 opacity-70" />
          <span className="text-gray-400 text-sm">Forecast</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span className="text-gray-400 text-sm">Over Capacity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t-2 border-dashed border-emerald-400" />
          <span className="text-gray-400 text-sm">Capacity</span>
        </div>
      </div>
    </div>
  );
}

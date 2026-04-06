'use client';

import { useState } from 'react';
import { ReportResult, ReportConfig, MetricSelection } from '@/types/report';
import { getMetricFormat, formatMetricValue } from '@/lib/utils/reportEngine';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface ReportResultsTableProps {
  result: ReportResult;
  config: ReportConfig;
}

export function ReportResultsTable({ result, config }: ReportResultsTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!result.data.length) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        No data to display
      </div>
    );
  }

  const metricLabels = config.metrics.map((m) => m.label);
  const hasGroup = !!config.groupBy;

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedData = [...result.data].sort((a, b) => {
    if (!sortKey) return 0;
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    const aNum = typeof aVal === 'number' ? aVal : String(aVal || '');
    const bNum = typeof bVal === 'number' ? bVal : String(bVal || '');

    if (typeof aNum === 'number' && typeof bNum === 'number') {
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum;
    }
    const cmp = String(aNum).localeCompare(String(bNum));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function formatValue(metric: MetricSelection, value: unknown): string {
    const num = typeof value === 'number' ? value : 0;
    const format = getMetricFormat(metric.source, metric.field);
    return formatMetricValue(num, format);
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sortKey !== col) return null;
    return sortDir === 'asc' ? (
      <ArrowUp className="w-3 h-3 inline ml-1" />
    ) : (
      <ArrowDown className="w-3 h-3 inline ml-1" />
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-700">
            {hasGroup && (
              <th
                className="text-left p-3 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort('group')}
              >
                Group
                <SortIcon col="group" />
              </th>
            )}
            {config.metrics.map((metric) => (
              <th
                key={metric.label}
                className="text-right p-3 text-gray-400 font-medium cursor-pointer hover:text-white transition-colors"
                onClick={() => handleSort(metric.label)}
              >
                {metric.label}
                <SortIcon col={metric.label} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((row, i) => (
            <tr
              key={i}
              className="border-b border-gray-800 hover:bg-white/5 transition-colors"
            >
              {hasGroup && (
                <td className="p-3 text-white font-medium">
                  {String(row.group || '')}
                </td>
              )}
              {config.metrics.map((metric) => (
                <td key={metric.label} className="p-3 text-right text-gray-300">
                  {formatValue(metric, row[metric.label])}
                </td>
              ))}
            </tr>
          ))}
          {/* Totals Row */}
          <tr className="border-t-2 border-gray-600 bg-white/5">
            {hasGroup && (
              <td className="p-3 text-white font-bold">Totals</td>
            )}
            {config.metrics.map((metric) => (
              <td key={metric.label} className="p-3 text-right text-white font-bold">
                {formatValue(metric, result.totals[metric.label])}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

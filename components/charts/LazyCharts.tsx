'use client';

import dynamic from 'next/dynamic';
import { Spinner } from '@/components/ui/Spinner';

const ChartLoading = () => (
  <div className="flex items-center justify-center h-[200px]">
    <Spinner size="md" />
  </div>
);

// Lazy load chart components to reduce initial bundle size
export const LazyRevenueChart = dynamic(
  () => import('./RevenueChart').then((mod) => mod.RevenueChart),
  {
    loading: ChartLoading,
    ssr: false,
  }
);

export const LazyLeadSourceChart = dynamic(
  () => import('./LeadSourceChart').then((mod) => mod.LeadSourceChart),
  {
    loading: ChartLoading,
    ssr: false,
  }
);

export const LazyJobTypeChart = dynamic(
  () => import('./JobTypeChart').then((mod) => mod.JobTypeChart),
  {
    loading: ChartLoading,
    ssr: false,
  }
);

export const LazyBusinessFlowDiagram = dynamic(
  () => import('./BusinessFlowDiagram').then((mod) => mod.BusinessFlowDiagram),
  {
    loading: ChartLoading,
    ssr: false,
  }
);

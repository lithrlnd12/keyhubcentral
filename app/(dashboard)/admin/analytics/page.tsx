'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, getDocs, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/lib/hooks';
import { Job } from '@/types/job';
import { Lead } from '@/types/lead';
import { Invoice } from '@/types/invoice';
import {
  HistoricalPoint,
  forecastRevenue,
  forecastLeadVolume,
  forecastInstallerDemand,
} from '@/lib/ai/forecasting';
import {
  getConversionRateBySource,
  getPipelineValue,
} from '@/lib/ai/predictions';
import { RevenueForecastChart } from '@/components/analytics/RevenueForecastChart';
import { LeadFunnelPrediction } from '@/components/analytics/LeadFunnelPrediction';
import { InstallerDemandForecast } from '@/components/analytics/InstallerDemandForecast';
import { PredictiveInsightsPanel } from '@/components/analytics/PredictiveInsightsPanel';
import { Brain, Calendar, Loader2 } from 'lucide-react';

type DateRange = '6m' | '12m' | '24m';

const DATE_RANGE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: '6m', label: '6 Months' },
  { value: '12m', label: '12 Months' },
  { value: '24m', label: '24 Months' },
];

const FORECAST_PERIODS = 6;
const DEFAULT_INSTALLER_CAPACITY = 15; // jobs per month

/** Safely convert a Firestore Timestamp or Date to a JS Date. */
function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  return null;
}

/** Get month key "YYYY-MM" from a Date. */
function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function AnalyticsDashboardPage() {
  const { user } = useAuth();
  const role = user?.role;
  const [dateRange, setDateRange] = useState<DateRange>('12m');
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [activeContractorCount, setActiveContractorCount] = useState(0);

  // Compute the cutoff date based on selected range
  const cutoffDate = useMemo(() => {
    const now = new Date();
    const months = dateRange === '6m' ? 6 : dateRange === '24m' ? 24 : 12;
    return new Date(now.getFullYear(), now.getMonth() - months, 1);
  }, [dateRange]);

  // Fetch data from Firestore
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      const [jobSnap, leadSnap, invoiceSnap, contractorSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'jobs'),
            where('createdAt', '>=', cutoffTimestamp),
            orderBy('createdAt', 'desc')
          )
        ),
        getDocs(
          query(
            collection(db, 'leads'),
            where('createdAt', '>=', cutoffTimestamp),
            orderBy('createdAt', 'desc')
          )
        ),
        getDocs(
          query(
            collection(db, 'invoices'),
            where('createdAt', '>=', cutoffTimestamp),
            orderBy('createdAt', 'desc')
          )
        ),
        getDocs(
          query(
            collection(db, 'contractors'),
            where('status', '==', 'active')
          )
        ),
      ]);

      setJobs(jobSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Job)));
      setLeads(leadSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead)));
      setInvoices(invoiceSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Invoice)));
      setActiveContractorCount(contractorSnap.size);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    } finally {
      setLoading(false);
    }
  }, [cutoffDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- Derived analytics data ----------

  // Monthly revenue from paid invoices
  const revenueHistory = useMemo<HistoricalPoint[]>(() => {
    const buckets: Record<string, number> = {};

    for (const inv of invoices) {
      if (inv.status !== 'paid' || !inv.paidAt) continue;
      const d = toDate(inv.paidAt);
      if (!d) continue;
      const key = monthKey(d);
      buckets[key] = (buckets[key] || 0) + (inv.total || 0);
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value]) => ({ period, value }));
  }, [invoices]);

  const revenueForecastData = useMemo(
    () => forecastRevenue(revenueHistory, FORECAST_PERIODS),
    [revenueHistory]
  );

  // Monthly lead counts
  const leadHistory = useMemo<HistoricalPoint[]>(() => {
    const buckets: Record<string, number> = {};

    for (const lead of leads) {
      if (!lead.createdAt) continue;
      const d = toDate(lead.createdAt);
      if (!d) continue;
      const key = monthKey(d);
      buckets[key] = (buckets[key] || 0) + 1;
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value]) => ({ period, value }));
  }, [leads]);

  const leadForecastData = useMemo(
    () => forecastLeadVolume(leadHistory, FORECAST_PERIODS),
    [leadHistory]
  );

  // Monthly job counts for installer demand
  const jobHistory = useMemo<HistoricalPoint[]>(() => {
    const buckets: Record<string, number> = {};

    for (const job of jobs) {
      if (!job.createdAt) continue;
      const d = toDate(job.createdAt);
      if (!d) continue;
      const key = monthKey(d);
      buckets[key] = (buckets[key] || 0) + 1;
    }

    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, value]) => ({ period, value }));
  }, [jobs]);

  const installerForecastData = useMemo(
    () => forecastInstallerDemand(jobHistory, FORECAST_PERIODS),
    [jobHistory]
  );

  // Estimate installer capacity from active contractor count
  // Assume each contractor handles ~3 jobs per month on average
  const installerCapacity = useMemo(
    () => Math.max(DEFAULT_INSTALLER_CAPACITY, activeContractorCount * 3),
    [activeContractorCount]
  );

  // Conversion rates
  const conversionRates = useMemo(
    () => getConversionRateBySource(leads),
    [leads]
  );

  // Average deal value from completed jobs
  const avgDealValue = useMemo(() => {
    const completedJobs = jobs.filter((j) =>
      ['complete', 'paid_in_full'].includes(j.status)
    );
    if (completedJobs.length === 0) return 5000;
    const total = completedJobs.reduce((sum, j) => {
      if (j.commission?.contractValue && j.commission.contractValue > 0) {
        return sum + j.commission.contractValue;
      }
      return (
        sum + (j.costs?.materialProjected || 0) + (j.costs?.laborProjected || 0)
      );
    }, 0);
    return total / completedJobs.length;
  }, [jobs]);

  // Pipeline value
  const pipelineValue = useMemo(
    () => getPipelineValue(leads, conversionRates, avgDealValue),
    [leads, conversionRates, avgDealValue]
  );

  // ---------- Access control ----------

  if (role && !['owner', 'admin'].includes(role)) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-400">
            Predictive analytics is available to owners and admins only.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/15">
            <Brain className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Predictive Analytics
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Revenue forecasts, lead predictions, and capacity planning
            </p>
          </div>
        </div>

        {/* Date range selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">Historical window:</span>
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            {DATE_RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDateRange(opt.value)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  dateRange === opt.value
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <p className="text-gray-400">Loading analytics data...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Revenue Forecast (full width) */}
          <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">
              Revenue Forecast
            </h2>
            <RevenueForecastChart
              historical={revenueHistory}
              forecast={revenueForecastData}
            />
          </section>

          {/* Two-column grid: Lead Funnel + Installer Demand */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-white mb-4">
                Lead Conversion Funnel
              </h2>
              <LeadFunnelPrediction leads={leads} />
            </section>

            <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <h2 className="text-lg font-semibold text-white mb-4">
                Installer Demand vs Capacity
              </h2>
              <InstallerDemandForecast
                historical={jobHistory}
                forecast={installerForecastData}
                installerCapacity={installerCapacity}
              />
            </section>
          </div>

          {/* Predictive Insights (full width) */}
          <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-white mb-4">
              Predictive Insights
            </h2>
            <PredictiveInsightsPanel
              revenueHistory={revenueHistory}
              revenueForecast={revenueForecastData}
              leadHistory={leadHistory}
              installerForecast={installerForecastData}
              installerCapacity={installerCapacity}
              conversionRates={conversionRates}
              pipelineValue={pipelineValue}
            />
          </section>
        </div>
      )}
    </div>
  );
}

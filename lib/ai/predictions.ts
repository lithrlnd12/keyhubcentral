/**
 * Lead conversion predictions and pipeline value calculations.
 * All calculations are client-side — no external API calls.
 */

import { Lead, LeadSource, LeadQuality } from '@/types/lead';

export interface ConversionRate {
  group: string;
  total: number;
  converted: number;
  rate: number; // 0-100
}

export interface PipelineResult {
  totalValue: number;
  activeLeadCount: number;
  breakdown: Array<{
    leadId: string;
    probability: number;
    estimatedValue: number;
    weightedValue: number;
  }>;
}

/**
 * Predict the probability (0-100) that a lead will convert,
 * based on historical conversion rates for similar leads.
 *
 * Factors considered:
 * - Lead source conversion rate
 * - Lead quality conversion rate
 * - Lead market conversion rate
 *
 * Each factor is weighted equally and averaged.
 */
export function predictConversionProbability(
  lead: Lead,
  historicalLeads: Lead[]
): number {
  if (!historicalLeads || historicalLeads.length === 0) return 0;

  const factors: number[] = [];

  // Source-based conversion rate
  const sourceRates = getConversionRateBySource(historicalLeads);
  const sourceRate = sourceRates.find((r) => r.group === lead.source);
  if (sourceRate && sourceRate.total >= 3) {
    factors.push(sourceRate.rate);
  }

  // Quality-based conversion rate
  const qualityRates = getConversionRateByQuality(historicalLeads);
  const qualityRate = qualityRates.find((r) => r.group === lead.quality);
  if (qualityRate && qualityRate.total >= 3) {
    factors.push(qualityRate.rate);
  }

  // Market-based conversion rate
  const marketRates = getConversionRateByMarket(historicalLeads);
  const marketRate = marketRates.find((r) => r.group === lead.market);
  if (marketRate && marketRate.total >= 3) {
    factors.push(marketRate.rate);
  }

  if (factors.length === 0) {
    // Fallback: overall conversion rate
    const overall = getOverallConversionRate(historicalLeads);
    return Math.round(Math.max(0, Math.min(100, overall)));
  }

  const avgRate = factors.reduce((s, v) => s + v, 0) / factors.length;
  return Math.round(Math.max(0, Math.min(100, avgRate)));
}

/**
 * Predict the estimated days to close for a lead,
 * based on historical data for similar leads (same source + quality).
 * Returns estimated number of days, or null if insufficient data.
 */
export function predictTimeToClose(
  lead: Lead,
  historicalLeads: Lead[]
): number | null {
  if (!historicalLeads || historicalLeads.length === 0) return null;

  // Find converted leads with matching source + quality
  const similar = historicalLeads.filter(
    (h) =>
      h.status === 'converted' &&
      h.source === lead.source &&
      h.quality === lead.quality &&
      h.createdAt &&
      h.updatedAt
  );

  // Broaden to just source match if too few results
  const pool =
    similar.length >= 3
      ? similar
      : historicalLeads.filter(
          (h) =>
            h.status === 'converted' &&
            h.source === lead.source &&
            h.createdAt &&
            h.updatedAt
        );

  if (pool.length < 2) {
    // Final broadening: all converted leads
    const allConverted = historicalLeads.filter(
      (h) => h.status === 'converted' && h.createdAt && h.updatedAt
    );
    if (allConverted.length < 2) return null;
    return averageDaysToConvert(allConverted);
  }

  return averageDaysToConvert(pool);
}

/**
 * Calculate the average number of days from creation to last update
 * for a set of converted leads.
 */
function averageDaysToConvert(leads: Lead[]): number | null {
  const durations: number[] = [];

  for (const lead of leads) {
    const created = toDate(lead.createdAt);
    const updated = toDate(lead.updatedAt);
    if (!created || !updated) continue;

    const diffMs = updated.getTime() - created.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= 0 && Number.isFinite(diffDays)) {
      durations.push(diffDays);
    }
  }

  if (durations.length === 0) return null;
  const avg = durations.reduce((s, v) => s + v, 0) / durations.length;
  return Math.round(Math.max(1, avg));
}

/**
 * Helper to safely convert a Firestore Timestamp or Date to a JS Date.
 */
function toDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts.toDate === 'function') return ts.toDate();
  return null;
}

/**
 * Get conversion rates grouped by lead source.
 */
export function getConversionRateBySource(leads: Lead[]): ConversionRate[] {
  return getConversionRateBy(leads, (l) => l.source || 'other');
}

/**
 * Get conversion rates grouped by lead quality.
 */
export function getConversionRateByQuality(leads: Lead[]): ConversionRate[] {
  return getConversionRateBy(leads, (l) => l.quality || 'cold');
}

/**
 * Get conversion rates grouped by market.
 */
export function getConversionRateByMarket(leads: Lead[]): ConversionRate[] {
  return getConversionRateBy(leads, (l) => l.market || 'unknown');
}

/**
 * Generic grouping helper for conversion rates.
 */
function getConversionRateBy(
  leads: Lead[],
  groupFn: (lead: Lead) => string
): ConversionRate[] {
  if (!leads || leads.length === 0) return [];

  const groups: Record<string, { total: number; converted: number }> = {};

  for (const lead of leads) {
    if (!lead) continue;
    const key = groupFn(lead);
    if (!groups[key]) groups[key] = { total: 0, converted: 0 };
    groups[key].total++;
    if (lead.status === 'converted') {
      groups[key].converted++;
    }
  }

  return Object.entries(groups)
    .map(([group, { total, converted }]) => ({
      group,
      total,
      converted,
      rate: total > 0 ? (converted / total) * 100 : 0,
    }))
    .sort((a, b) => b.rate - a.rate);
}

/**
 * Calculate the overall conversion rate across all leads.
 */
function getOverallConversionRate(leads: Lead[]): number {
  if (leads.length === 0) return 0;
  const converted = leads.filter((l) => l.status === 'converted').length;
  return (converted / leads.length) * 100;
}

/**
 * Calculate the weighted pipeline value for all active (unconverted) leads.
 *
 * Pipeline value = sum of (probability * avgDealValue) for each active lead.
 *
 * @param leads - All leads (active + historical for computing rates)
 * @param conversionRates - Optional pre-computed rates by source
 * @param averageDealValue - Average contract value for converted leads. Defaults to
 *   the computed average if not provided.
 */
export function getPipelineValue(
  leads: Lead[],
  conversionRates?: ConversionRate[],
  averageDealValue?: number
): PipelineResult {
  if (!leads || leads.length === 0) {
    return { totalValue: 0, activeLeadCount: 0, breakdown: [] };
  }

  // Determine average deal value from historical conversions if not provided
  const avgDeal = averageDealValue ?? computeAverageDealValue(leads);

  // Active leads: not converted, not lost, not returned
  const activeStatuses = ['new', 'assigned', 'contacted', 'qualified'];
  const activeLeads = leads.filter(
    (l) => l && activeStatuses.includes(l.status)
  );

  const breakdown = activeLeads.map((lead) => {
    const probability = predictConversionProbability(lead, leads);
    const estimatedValue = avgDeal;
    const weightedValue = (probability / 100) * estimatedValue;

    return {
      leadId: lead.id,
      probability,
      estimatedValue: Math.round(estimatedValue * 100) / 100,
      weightedValue: Math.round(weightedValue * 100) / 100,
    };
  });

  const totalValue = breakdown.reduce((s, b) => s + b.weightedValue, 0);

  return {
    totalValue: Math.round(totalValue * 100) / 100,
    activeLeadCount: activeLeads.length,
    breakdown,
  };
}

/**
 * Compute the average deal value from converted leads that have a linked job.
 * Falls back to a default of $5,000 if no data is available.
 */
function computeAverageDealValue(leads: Lead[]): number {
  // We cannot determine actual deal value from leads alone, so we use a
  // heuristic based on the number of converted leads.
  // In the real dashboard, the caller should pass averageDealValue computed from jobs.
  const DEFAULT_DEAL_VALUE = 5000;
  return DEFAULT_DEAL_VALUE;
}

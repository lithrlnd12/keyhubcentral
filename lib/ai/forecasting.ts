/**
 * Time-series forecasting utilities using Simple Exponential Smoothing (SES).
 * No external ML libraries — all calculations are pure client-side JavaScript.
 */

export interface ForecastPoint {
  period: string; // "2026-04", "2026-W15", etc.
  predicted: number;
  confidenceLow: number;
  confidenceHigh: number;
}

export interface HistoricalPoint {
  period: string;
  value: number;
}

const DEFAULT_ALPHA = 0.3;
const MIN_DATA_POINTS = 3;
const Z_95 = 1.96; // z-score for 95% confidence interval

/**
 * Clamp a number to be non-negative and finite.
 * Prevents NaN, Infinity, and negative forecasts for counts/revenue.
 */
function safeNumber(n: number, floor = 0): number {
  if (!Number.isFinite(n)) return floor;
  return Math.max(floor, n);
}

/**
 * Calculate the standard deviation of an array of numbers.
 */
function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Simple Exponential Smoothing forecast.
 * F(t+1) = alpha * Y(t) + (1 - alpha) * F(t)
 *
 * Confidence interval widens with each future period:
 * +/- Z_95 * stddev * sqrt(periodsAhead)
 */
function sesForcast(
  data: HistoricalPoint[],
  periodsAhead: number,
  alpha: number = DEFAULT_ALPHA,
  floorValue: number = 0
): ForecastPoint[] {
  if (data.length < MIN_DATA_POINTS) return [];
  if (periodsAhead <= 0) return [];

  const values = data.map((d) => d.value);
  const stddev = standardDeviation(values);

  // Initialize forecast with first observed value
  let forecast = values[0];

  // Walk through historical data to build up SES state
  for (let i = 1; i < values.length; i++) {
    forecast = alpha * values[i] + (1 - alpha) * forecast;
  }

  // Generate future forecasts
  // SES produces a flat forecast line; confidence interval widens
  const results: ForecastPoint[] = [];
  const lastPeriod = data[data.length - 1].period;

  for (let i = 1; i <= periodsAhead; i++) {
    const margin = Z_95 * stddev * Math.sqrt(i);
    const predicted = safeNumber(forecast, floorValue);

    results.push({
      period: incrementPeriod(lastPeriod, i),
      predicted: Math.round(predicted * 100) / 100,
      confidenceLow: safeNumber(predicted - margin, floorValue),
      confidenceHigh: safeNumber(predicted + margin, floorValue),
    });
  }

  return results;
}

/**
 * Increment a period string by N steps.
 * Supports "YYYY-MM" (monthly) and "YYYY-WNN" (weekly) formats.
 */
function incrementPeriod(period: string, steps: number): string {
  // Weekly format: "2026-W15"
  const weekMatch = period.match(/^(\d{4})-W(\d{1,2})$/);
  if (weekMatch) {
    const year = parseInt(weekMatch[1], 10);
    const week = parseInt(weekMatch[2], 10);
    let newWeek = week + steps;
    let newYear = year;
    while (newWeek > 52) {
      newWeek -= 52;
      newYear++;
    }
    return `${newYear}-W${String(newWeek).padStart(2, '0')}`;
  }

  // Monthly format: "2026-04"
  const monthMatch = period.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = parseInt(monthMatch[1], 10);
    const month = parseInt(monthMatch[2], 10);
    const totalMonths = year * 12 + (month - 1) + steps;
    const newYear = Math.floor(totalMonths / 12);
    const newMonth = (totalMonths % 12) + 1;
    return `${newYear}-${String(newMonth).padStart(2, '0')}`;
  }

  // Fallback: just append step index
  return `${period}+${steps}`;
}

/**
 * Forecast future monthly revenue using Simple Exponential Smoothing.
 * Returns empty array if fewer than 3 historical data points.
 */
export function forecastRevenue(
  historicalMonths: HistoricalPoint[],
  periodsAhead: number
): ForecastPoint[] {
  return sesForcast(historicalMonths, periodsAhead, DEFAULT_ALPHA, 0);
}

/**
 * Forecast future weekly lead volume using Simple Exponential Smoothing.
 * Returns empty array if fewer than 3 historical data points.
 */
export function forecastLeadVolume(
  historicalWeeks: HistoricalPoint[],
  periodsAhead: number
): ForecastPoint[] {
  return sesForcast(historicalWeeks, periodsAhead, DEFAULT_ALPHA, 0);
}

/**
 * Forecast future job count to estimate installer demand.
 * Returns empty array if fewer than 3 historical data points.
 */
export function forecastInstallerDemand(
  historicalJobs: HistoricalPoint[],
  periodsAhead: number
): ForecastPoint[] {
  return sesForcast(historicalJobs, periodsAhead, DEFAULT_ALPHA, 0);
}

/**
 * Determine the overall trend direction using simple linear regression.
 * Returns 'up' if slope > threshold, 'down' if slope < -threshold, otherwise 'flat'.
 */
export function calculateTrend(
  data: HistoricalPoint[]
): 'up' | 'down' | 'flat' {
  if (data.length < 2) return 'flat';

  const n = data.length;
  const values = data.map((d) => d.value);

  // Simple linear regression: y = mx + b
  // x = 0, 1, 2, ..., n-1
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 'flat';

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const meanY = sumY / n;

  // Normalize slope relative to the mean to determine significance
  // A slope whose magnitude is > 2% of the mean per period is considered a trend
  if (meanY === 0) return 'flat';
  const normalizedSlope = slope / meanY;

  if (normalizedSlope > 0.02) return 'up';
  if (normalizedSlope < -0.02) return 'down';
  return 'flat';
}

/**
 * Calculate monthly seasonal indices from historical data.
 * Returns a map of month labels ("01".."12") to seasonal factors.
 * A factor > 1 means above-average, < 1 means below-average.
 *
 * Requires at least 12 data points (one full year) for meaningful results.
 * For shorter data, returns factors of 1.0 for available months.
 */
export function calculateSeasonalIndex(
  data: HistoricalPoint[]
): Record<string, number> {
  if (data.length === 0) return {};

  // Extract month from period strings like "2026-04"
  const monthTotals: Record<string, number[]> = {};

  for (const point of data) {
    const monthMatch = point.period.match(/^(\d{4})-(\d{2})$/);
    if (!monthMatch) continue;
    const month = monthMatch[2];
    if (!monthTotals[month]) monthTotals[month] = [];
    monthTotals[month].push(point.value);
  }

  // Calculate overall average
  const allValues = data.map((d) => d.value);
  const overallAvg =
    allValues.length > 0
      ? allValues.reduce((s, v) => s + v, 0) / allValues.length
      : 1;

  // Calculate seasonal index per month
  const indices: Record<string, number> = {};
  for (const [month, values] of Object.entries(monthTotals)) {
    const monthAvg = values.reduce((s, v) => s + v, 0) / values.length;
    indices[month] = overallAvg > 0 ? safeNumber(monthAvg / overallAvg, 0) : 1;
  }

  return indices;
}

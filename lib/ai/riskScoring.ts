import { Job, JobType } from '@/types/job';
import { Contractor, Rating } from '@/types/contractor';

// ============================================================
// Risk Score Types
// ============================================================

export interface RiskScore {
  overall: number; // 0-100 (0 = low risk, 100 = high risk)
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  recommendations: string[];
}

export interface RiskFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  description: string;
}

export interface HistoricalData {
  totalJobs: number;
  callbackCount: number;
  callbackRate: number; // 0-1 as a percentage
  avgDaysToCallback: number | null;
}

// ============================================================
// Factor Weight Configuration
// ============================================================

const WEIGHTS = {
  installerRating: 0.30,
  installerWarranty: 0.20,
  jobValue: 0.15,
  season: 0.10,
  jobType: 0.10,
  historicalCallback: 0.15,
} as const;

// ============================================================
// Individual Factor Scoring (pure functions)
// ============================================================

function scoreInstallerRating(rating: Rating | undefined): RiskFactor {
  let score: number;
  let description: string;

  if (!rating || rating.overall === 0) {
    score = 50;
    description = 'No installer rating available — defaulting to medium risk';
  } else if (rating.overall >= 4.0) {
    score = 10;
    description = `Installer rated ${rating.overall.toFixed(1)} — minimal callback risk`;
  } else if (rating.overall >= 3.5) {
    score = 30;
    description = `Installer rated ${rating.overall.toFixed(1)} — low callback risk`;
  } else if (rating.overall >= 3.0) {
    score = 50;
    description = `Installer rated ${rating.overall.toFixed(1)} — moderate callback risk`;
  } else {
    score = 80;
    description = `Installer rated ${rating.overall.toFixed(1)} — high callback risk`;
  }

  return {
    name: 'Installer Rating',
    score,
    weight: WEIGHTS.installerRating,
    description,
  };
}

function scoreInstallerWarranty(rating: Rating | undefined): RiskFactor {
  let score: number;
  let description: string;

  if (!rating || rating.warranty === 0) {
    score = 50;
    description = 'No warranty rating available — defaulting to medium risk';
  } else if (rating.warranty >= 4.0) {
    score = 10;
    description = `Warranty rating ${rating.warranty.toFixed(1)} — excellent warranty track record`;
  } else if (rating.warranty >= 3.0) {
    score = 40;
    description = `Warranty rating ${rating.warranty.toFixed(1)} — average warranty track record`;
  } else {
    score = 80;
    description = `Warranty rating ${rating.warranty.toFixed(1)} — poor warranty track record`;
  }

  return {
    name: 'Installer Warranty Score',
    score,
    weight: WEIGHTS.installerWarranty,
    description,
  };
}

function scoreJobValue(job: Job): RiskFactor {
  const totalCost =
    (job.costs?.materialProjected || 0) + (job.costs?.laborProjected || 0);

  let score: number;
  let description: string;

  if (totalCost === 0) {
    score = 30;
    description = 'Job value not yet estimated — defaulting to low-medium risk';
  } else if (totalCost < 5000) {
    score = 10;
    description = `Job value $${totalCost.toLocaleString()} — lower-value jobs carry less risk`;
  } else if (totalCost < 10000) {
    score = 30;
    description = `Job value $${totalCost.toLocaleString()} — moderate value`;
  } else if (totalCost < 15000) {
    score = 50;
    description = `Job value $${totalCost.toLocaleString()} — higher-value job increases exposure`;
  } else {
    score = 70;
    description = `Job value $${totalCost.toLocaleString()} — high-value project with significant exposure`;
  }

  return {
    name: 'Job Value',
    score,
    weight: WEIGHTS.jobValue,
    description,
  };
}

function scoreSeasonFactor(job: Job): RiskFactor {
  const isExterior = job.type === 'exterior';
  const isBathroom = job.type === 'bathroom';

  // Use scheduled start date if available, otherwise creation date
  const dateField = job.dates?.scheduledStart || job.dates?.created;
  let month: number;

  if (dateField && typeof dateField.toDate === 'function') {
    month = dateField.toDate().getMonth(); // 0-indexed
  } else {
    month = new Date().getMonth();
  }

  const isWinter = month >= 10 || month <= 1; // Nov(10), Dec(11), Jan(0), Feb(1)

  let score: number;
  let description: string;

  if (isBathroom) {
    score = 30;
    description = 'Indoor bathroom work — season-neutral risk';
  } else if (isExterior && isWinter) {
    score = 60;
    description = 'Exterior work during winter months — weather-related risk elevated';
  } else if (isExterior) {
    score = 20;
    description = 'Exterior work during favorable season — lower weather risk';
  } else if (isWinter) {
    score = 45;
    description = 'Winter months — moderate weather-related risk for general work';
  } else {
    score = 20;
    description = 'Favorable season — lower weather risk';
  }

  return {
    name: 'Season',
    score,
    weight: WEIGHTS.season,
    description,
  };
}

function scoreJobType(job: Job): RiskFactor {
  const complexTypes: JobType[] = ['kitchen'];
  const simpleTypes: JobType[] = ['bathroom'];

  let score: number;
  let description: string;

  if (complexTypes.includes(job.type)) {
    score = 60;
    description = `${job.type} remodel — complex job type with higher callback potential`;
  } else if (simpleTypes.includes(job.type)) {
    score = 20;
    description = `${job.type} job — simpler scope with lower callback potential`;
  } else if (job.type === 'exterior') {
    score = 45;
    description = 'Exterior work — moderate complexity with environmental exposure';
  } else {
    score = 40;
    description = `${job.type} job — default medium complexity`;
  }

  return {
    name: 'Job Type',
    score,
    weight: WEIGHTS.jobType,
    description,
  };
}

function scoreHistoricalCallbacks(
  historicalData: HistoricalData | undefined
): RiskFactor {
  let score: number;
  let description: string;

  if (!historicalData || historicalData.totalJobs === 0) {
    score = 40;
    description = 'No historical callback data available — defaulting to medium risk';
  } else {
    const rate = historicalData.callbackRate * 100; // convert to percentage

    if (rate > 10) {
      score = 90;
      description = `Callback rate ${rate.toFixed(1)}% — significantly above acceptable threshold`;
    } else if (rate > 5) {
      score = 60;
      description = `Callback rate ${rate.toFixed(1)}% — above target, needs attention`;
    } else if (rate > 2) {
      score = 30;
      description = `Callback rate ${rate.toFixed(1)}% — within acceptable range`;
    } else {
      score = 10;
      description = `Callback rate ${rate.toFixed(1)}% — excellent track record`;
    }
  }

  return {
    name: 'Historical Callback Rate',
    score,
    weight: WEIGHTS.historicalCallback,
    description,
  };
}

// ============================================================
// Recommendation Generation
// ============================================================

function generateRecommendations(factors: RiskFactor[], overall: number): string[] {
  const recommendations: string[] = [];

  const ratingFactor = factors.find((f) => f.name === 'Installer Rating');
  const warrantyFactor = factors.find((f) => f.name === 'Installer Warranty Score');
  const valueFactor = factors.find((f) => f.name === 'Job Value');
  const seasonFactor = factors.find((f) => f.name === 'Season');
  const callbackFactor = factors.find((f) => f.name === 'Historical Callback Rate');

  if (ratingFactor && ratingFactor.score >= 50) {
    recommendations.push(
      'Consider assigning an Elite-tier installer for this job'
    );
  }

  if (valueFactor && valueFactor.score >= 50 && overall >= 25) {
    recommendations.push(
      'Schedule a mid-job quality check for this high-value project'
    );
  }

  if (seasonFactor && seasonFactor.score >= 45) {
    recommendations.push(
      'Plan for weather delays; confirm material weather ratings'
    );
  }

  if (callbackFactor && callbackFactor.score >= 60) {
    recommendations.push(
      "Review this installer's recent callback reasons before assignment"
    );
  }

  if (warrantyFactor && warrantyFactor.score >= 50) {
    recommendations.push(
      'Require detailed warranty documentation and completion photos'
    );
  }

  if (overall >= 75) {
    recommendations.push(
      'Consider assigning a PM to oversee this job given the critical risk level'
    );
  }

  return recommendations;
}

// ============================================================
// Risk Level Assignment
// ============================================================

function getRiskLevel(score: number): RiskScore['level'] {
  if (score < 25) return 'low';
  if (score < 50) return 'medium';
  if (score < 75) return 'high';
  return 'critical';
}

// ============================================================
// Main Scoring Function
// ============================================================

/**
 * Calculate a predictive callback risk score for a job.
 *
 * Pure function: same inputs always produce the same outputs.
 * Handles missing data gracefully with sensible defaults.
 */
export function calculateJobRiskScore(
  job: Job,
  contractor: Contractor | null,
  historicalData?: HistoricalData
): RiskScore {
  const rating = contractor?.rating;

  const factors: RiskFactor[] = [
    scoreInstallerRating(rating),
    scoreInstallerWarranty(rating),
    scoreJobValue(job),
    scoreSeasonFactor(job),
    scoreJobType(job),
    scoreHistoricalCallbacks(historicalData),
  ];

  // Weighted sum
  const overall = Math.round(
    factors.reduce((sum, factor) => sum + factor.score * factor.weight, 0)
  );

  // Clamp to 0-100
  const clampedOverall = Math.max(0, Math.min(100, overall));

  const level = getRiskLevel(clampedOverall);
  const recommendations = generateRecommendations(factors, clampedOverall);

  return {
    overall: clampedOverall,
    level,
    factors,
    recommendations,
  };
}

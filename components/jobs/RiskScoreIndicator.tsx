'use client';

import { RiskScore } from '@/lib/ai/riskScoring';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

interface RiskScoreIndicatorProps {
  score: RiskScore;
  compact?: boolean;
  className?: string;
}

const LEVEL_COLORS: Record<RiskScore['level'], { bg: string; text: string; ring: string; bar: string }> = {
  low: {
    bg: 'bg-green-500/10',
    text: 'text-green-500',
    ring: 'stroke-green-500',
    bar: 'bg-green-500',
  },
  medium: {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-500',
    ring: 'stroke-yellow-500',
    bar: 'bg-yellow-500',
  },
  high: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-500',
    ring: 'stroke-orange-500',
    bar: 'bg-orange-500',
  },
  critical: {
    bg: 'bg-red-500/10',
    text: 'text-red-500',
    ring: 'stroke-red-500',
    bar: 'bg-red-500',
  },
};

const LEVEL_LABELS: Record<RiskScore['level'], string> = {
  low: 'Low Risk',
  medium: 'Medium Risk',
  high: 'High Risk',
  critical: 'Critical Risk',
};

// SVG circular gauge component
function CircularGauge({ score, level }: { score: number; level: RiskScore['level'] }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const colors = LEVEL_COLORS[level];

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        {/* Background ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-gray-700"
        />
        {/* Progress ring */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          className={colors.ring}
        />
      </svg>
      {/* Score text in center */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-2xl font-bold', colors.text)}>{score}</span>
      </div>
    </div>
  );
}

// Compact mode: just a colored badge with score
function CompactView({ score, className }: { score: RiskScore; className?: string }) {
  const colors = LEVEL_COLORS[score.level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold',
        colors.bg,
        colors.text,
        className
      )}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', colors.bar)}
      />
      {LEVEL_LABELS[score.level]} {score.overall}
    </span>
  );
}

// Full mode: detailed card with gauge, factors, and recommendations
function FullView({ score, className }: { score: RiskScore; className?: string }) {
  const colors = LEVEL_COLORS[score.level];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Callback Risk Assessment</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Score gauge and level */}
        <div className="flex items-center gap-6 mb-6">
          <CircularGauge score={score.overall} level={score.level} />
          <div>
            <p className={cn('text-lg font-semibold', colors.text)}>
              {LEVEL_LABELS[score.level]}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Score {score.overall} / 100
            </p>
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="space-y-3 mb-6">
          <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide">
            Risk Factors
          </h4>
          {score.factors.map((factor) => {
            const factorColors = getFactorColor(factor.score);
            return (
              <div key={factor.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">{factor.name}</span>
                  <span className={cn('font-medium', factorColors.text)}>
                    {factor.score}
                  </span>
                </div>
                {/* Mini progress bar */}
                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-300',
                      factorColors.bar
                    )}
                    style={{ width: `${factor.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500">{factor.description}</p>
              </div>
            );
          })}
        </div>

        {/* Recommendations */}
        {score.recommendations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 uppercase tracking-wide mb-2">
              Recommendations
            </h4>
            <ul className="space-y-2">
              {score.recommendations.map((rec, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-gray-400"
                >
                  <span className={cn('mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0', colors.bar)} />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getFactorColor(score: number): { text: string; bar: string } {
  if (score < 25) return { text: 'text-green-500', bar: 'bg-green-500' };
  if (score < 50) return { text: 'text-yellow-500', bar: 'bg-yellow-500' };
  if (score < 75) return { text: 'text-orange-500', bar: 'bg-orange-500' };
  return { text: 'text-red-500', bar: 'bg-red-500' };
}

export function RiskScoreIndicator({
  score,
  compact = false,
  className,
}: RiskScoreIndicatorProps) {
  if (compact) {
    return <CompactView score={score} className={className} />;
  }

  return <FullView score={score} className={className} />;
}

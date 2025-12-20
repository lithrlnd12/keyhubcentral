'use client';

import { Star, Users, Clock, Wrench, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Rating, getRatingTier, getCommissionRate } from '@/types/contractor';
import { getTierInfo, RATING_CATEGORIES, getRatingLevel } from '@/lib/utils/ratings';

interface RatingCardProps {
  rating: Rating;
  showCommission?: boolean;
  compact?: boolean;
}

interface CategoryRowProps {
  category: keyof typeof RATING_CATEGORIES;
  value: number;
  icon: React.ReactNode;
}

function CategoryRow({ category, value, icon }: CategoryRowProps) {
  const info = RATING_CATEGORIES[category];
  const percentage = (value / 5) * 100;
  const level = getRatingLevel(value);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{icon}</span>
          <div>
            <span className="text-sm text-white">{info.label}</span>
            <span className="text-xs text-gray-500 ml-2">({info.weight})</span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-white font-medium">{value.toFixed(1)}</span>
          <span className="text-xs text-gray-500 ml-2">{level}</span>
        </div>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-gold rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{info.description}</p>
    </div>
  );
}

export function RatingCard({ rating, showCommission = true, compact = false }: RatingCardProps) {
  const tier = getRatingTier(rating.overall);
  const tierInfo = getTierInfo(tier);
  const commissionRate = getCommissionRate(tier);

  if (compact) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl font-bold text-white">{rating.overall.toFixed(1)}</div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(rating.overall)
                        ? 'text-brand-gold fill-brand-gold'
                        : 'text-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${tierInfo.bgColor} ${tierInfo.color}`}>
              {tierInfo.label}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Performance Rating</span>
          <div className={`px-3 py-1 rounded-full text-sm ${tierInfo.bgColor} ${tierInfo.color}`}>
            {tierInfo.label}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Score */}
        <div className="text-center py-4 border-b border-gray-800">
          <div className="text-5xl font-bold text-white mb-2">{rating.overall.toFixed(1)}</div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-6 h-6 ${
                  star <= Math.round(rating.overall)
                    ? 'text-brand-gold fill-brand-gold'
                    : 'text-gray-600'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-400">{tierInfo.description}</p>
        </div>

        {/* Category Breakdown */}
        <div className="space-y-5">
          <CategoryRow
            category="customer"
            value={rating.customer}
            icon={<Users className="w-4 h-4" />}
          />
          <CategoryRow
            category="speed"
            value={rating.speed}
            icon={<Clock className="w-4 h-4" />}
          />
          <CategoryRow
            category="warranty"
            value={rating.warranty}
            icon={<Wrench className="w-4 h-4" />}
          />
          <CategoryRow
            category="internal"
            value={rating.internal}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* Commission Rate */}
        {showCommission && (
          <div className="pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Commission Rate</span>
              <span className="text-2xl font-bold text-brand-gold">
                {(commissionRate * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState } from 'react';
import { Star, Users, Clock, Wrench, TrendingUp, Save, RotateCcw, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Rating, getRatingTier, getCommissionRate } from '@/types/contractor';
import { updateRating, getTierInfo, RATING_CATEGORIES, calculateOverallRating } from '@/lib/utils/ratings';
import { mergeContractorRating, resetContractorRating } from '@/lib/firebase/ratings';

interface RatingEditorProps {
  contractorId: string;
  rating: Rating;
  onUpdate: (rating: Rating) => void;
}

interface RatingSliderProps {
  category: keyof typeof RATING_CATEGORIES;
  value: number;
  onChange: (value: number) => void;
  icon: React.ReactNode;
}

function RatingSlider({ category, value, onChange, icon }: RatingSliderProps) {
  const info = RATING_CATEGORIES[category];

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
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="focus:outline-none focus:ring-2 focus:ring-brand-gold rounded"
            >
              <Star
                className={`w-5 h-5 transition-colors ${
                  star <= value
                    ? 'text-brand-gold fill-brand-gold'
                    : 'text-gray-600 hover:text-gray-400'
                }`}
              />
            </button>
          ))}
          <span className="text-white font-medium w-8 text-right">{value.toFixed(1)}</span>
        </div>
      </div>
      <input
        type="range"
        min="1"
        max="5"
        step="0.1"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-brand-gold"
      />
      <p className="text-xs text-gray-500">{info.description}</p>
    </div>
  );
}

export function RatingEditor({ contractorId, rating, onUpdate }: RatingEditorProps) {
  const [editedRating, setEditedRating] = useState<Rating>(rating);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    editedRating.customer !== rating.customer ||
    editedRating.speed !== rating.speed ||
    editedRating.warranty !== rating.warranty ||
    editedRating.internal !== rating.internal;

  const previewTier = getRatingTier(editedRating.overall);
  const tierInfo = getTierInfo(previewTier);
  const commissionRate = getCommissionRate(previewTier);

  const updateCategory = (
    category: 'customer' | 'speed' | 'warranty' | 'internal',
    value: number
  ) => {
    const updated = updateRating(editedRating, { [category]: value });
    setEditedRating(updated);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const newRating = await mergeContractorRating(contractorId, rating, {
        customer: editedRating.customer,
        speed: editedRating.speed,
        warranty: editedRating.warranty,
        internal: editedRating.internal,
      });
      onUpdate(newRating);
    } catch (err) {
      setError('Failed to save rating');
      console.error('Error saving rating:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setError(null);

    try {
      const newRating = await resetContractorRating(contractorId);
      setEditedRating(newRating);
      onUpdate(newRating);
    } catch (err) {
      setError('Failed to reset rating');
      console.error('Error resetting rating:', err);
    } finally {
      setResetting(false);
    }
  };

  const handleCancel = () => {
    setEditedRating(rating);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Edit Rating</span>
          <div className={`px-3 py-1 rounded-full text-sm ${tierInfo.bgColor} ${tierInfo.color}`}>
            {tierInfo.label}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-500">{error}</p>
          </div>
        )}

        {/* Preview Score */}
        <div className="text-center py-4 border-b border-gray-800">
          <div className="text-4xl font-bold text-white mb-1">
            {editedRating.overall.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(editedRating.overall)
                    ? 'text-brand-gold fill-brand-gold'
                    : 'text-gray-600'
                }`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-400">
            Commission Rate: <span className="text-brand-gold font-medium">{(commissionRate * 100).toFixed(0)}%</span>
          </p>
        </div>

        {/* Category Sliders */}
        <div className="space-y-6">
          <RatingSlider
            category="customer"
            value={editedRating.customer}
            onChange={(v) => updateCategory('customer', v)}
            icon={<Users className="w-4 h-4" />}
          />
          <RatingSlider
            category="speed"
            value={editedRating.speed}
            onChange={(v) => updateCategory('speed', v)}
            icon={<Clock className="w-4 h-4" />}
          />
          <RatingSlider
            category="warranty"
            value={editedRating.warranty}
            onChange={(v) => updateCategory('warranty', v)}
            icon={<Wrench className="w-4 h-4" />}
          />
          <RatingSlider
            category="internal"
            value={editedRating.internal}
            onChange={(v) => updateCategory('internal', v)}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* Formula explanation */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-500">
            Overall = Customer ({(editedRating.customer * 0.4).toFixed(1)}) + Speed ({(editedRating.speed * 0.2).toFixed(1)}) + Warranty ({(editedRating.warranty * 0.2).toFixed(1)}) + Internal ({(editedRating.internal * 0.2).toFixed(1)}) = {editedRating.overall.toFixed(1)}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-800">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetting || saving}
            className="flex-1"
          >
            {resetting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4 mr-2" />
            )}
            Reset
          </Button>
          {hasChanges && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={saving}
              className="flex-1"
            >
              Cancel
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="flex-1"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

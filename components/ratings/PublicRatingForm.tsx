'use client';

import { useState } from 'react';
import { Star, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { submitRating } from '@/lib/firebase/ratingRequests';
import { RatingRequest } from '@/types/ratingRequest';

interface Props {
  ratingRequest: RatingRequest;
}

export default function PublicRatingForm({ ratingRequest }: Props) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);

    try {
      await submitRating(ratingRequest.token, rating, comment.trim() || undefined);
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting rating:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
        <p className="text-gray-400 mb-4">
          Your feedback has been submitted successfully.
        </p>
        <p className="text-gray-500 text-sm">
          Your rating helps us maintain quality service and recognize our top contractors.
        </p>
      </div>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Job Info */}
      <div className="bg-brand-black/50 rounded-lg p-4 border border-gray-700">
        <p className="text-gray-400 text-sm mb-1">Job #{ratingRequest.jobNumber}</p>
        <p className="text-white font-medium">{ratingRequest.contractorName}</p>
      </div>

      {/* Star Rating */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3 text-center">
          How was your experience?
        </label>
        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-brand-gold focus:ring-offset-2 focus:ring-offset-brand-charcoal rounded"
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= displayRating
                    ? 'text-brand-gold fill-brand-gold'
                    : 'text-gray-600'
                }`}
              />
            </button>
          ))}
        </div>
        {displayRating > 0 && (
          <p className="text-center mt-2 text-gray-400 text-sm">
            {displayRating === 1 && 'Poor'}
            {displayRating === 2 && 'Fair'}
            {displayRating === 3 && 'Good'}
            {displayRating === 4 && 'Very Good'}
            {displayRating === 5 && 'Excellent'}
          </p>
        )}
      </div>

      {/* Comment */}
      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-medium text-gray-300 mb-2"
        >
          Additional Comments (Optional)
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-brand-black border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold transition-colors resize-none"
          placeholder="Tell us more about your experience..."
          maxLength={500}
        />
        <p className="text-xs text-gray-500 mt-1 text-right">
          {comment.length}/500
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={submitting || rating === 0}
        className="w-full py-3 bg-brand-gold hover:bg-brand-gold-dark text-brand-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Submitting...
          </>
        ) : (
          'Submit Rating'
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        Your feedback is anonymous and helps us improve our service.
      </p>
    </form>
  );
}

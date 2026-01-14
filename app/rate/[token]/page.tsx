'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Loader2, AlertCircle, Clock } from 'lucide-react';
import { getRatingRequestByToken } from '@/lib/firebase/ratingRequests';
import { RatingRequest, isRatingRequestExpired, getDaysUntilExpiry } from '@/types/ratingRequest';
import PublicRatingForm from '@/components/ratings/PublicRatingForm';

export default function PublicRatingPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [ratingRequest, setRatingRequest] = useState<RatingRequest | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRatingRequest() {
      if (!token) {
        setError('Invalid rating link');
        setLoading(false);
        return;
      }

      try {
        const request = await getRatingRequestByToken(token);

        if (!request) {
          setError('Rating request not found. The link may be invalid or expired.');
          setLoading(false);
          return;
        }

        // Check if already completed
        if (request.status === 'completed') {
          setError('This rating has already been submitted. Thank you for your feedback!');
          setLoading(false);
          return;
        }

        // Check if expired
        if (isRatingRequestExpired(request)) {
          setError('This rating request has expired. Please contact us if you would still like to provide feedback.');
          setLoading(false);
          return;
        }

        setRatingRequest(request);
      } catch (err) {
        console.error('Error fetching rating request:', err);
        setError('Something went wrong. Please try again later.');
      } finally {
        setLoading(false);
      }
    }

    fetchRatingRequest();
  }, [token]);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-brand-gold animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
        <div className="bg-brand-charcoal rounded-2xl p-8 max-w-md w-full text-center border border-gray-800">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Unable to Load Rating</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Valid rating request
  if (!ratingRequest) {
    return null;
  }

  const daysRemaining = getDaysUntilExpiry(ratingRequest);

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="bg-brand-charcoal rounded-2xl p-8 max-w-md w-full border border-gray-800">
        {/* Logo/Branding */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <Image
              src="/icon-512x512.png"
              alt="KeyHub Central"
              width={64}
              height={64}
              className="rounded-xl"
            />
          </div>
          <h1 className="text-2xl font-bold text-white">Rate Your Experience</h1>
          <p className="text-gray-400 mt-2">
            Hi {ratingRequest.customerName}, please take a moment to rate your service.
          </p>
        </div>

        {/* Expiry Warning */}
        {daysRemaining <= 7 && daysRemaining > 0 && (
          <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-yellow-400 text-sm mb-6">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>This link expires in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</span>
          </div>
        )}

        {/* Rating Form */}
        <PublicRatingForm ratingRequest={ratingRequest} />

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            KeyHub Central - Quality Service, Guaranteed
          </p>
        </div>
      </div>
    </div>
  );
}

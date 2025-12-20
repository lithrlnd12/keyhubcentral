'use client';

import { useEffect } from 'react';
import { Button, Logo } from '@/components/ui';

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Auth error:', error);
  }, [error]);

  return (
    <div className="text-center">
      <Logo size="lg" className="mx-auto mb-8" />
      <div className="bg-brand-charcoal rounded-xl p-8 max-w-md mx-auto">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-7 h-7 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">Authentication Error</h2>
        <p className="text-gray-400 mb-6">
          There was a problem with authentication. Please try again.
        </p>
        <div className="flex flex-col gap-3">
          <Button onClick={reset} variant="primary" className="w-full">
            Try again
          </Button>
          <Button onClick={() => (window.location.href = '/login')} variant="outline" className="w-full">
            Back to Login
          </Button>
        </div>
      </div>
    </div>
  );
}

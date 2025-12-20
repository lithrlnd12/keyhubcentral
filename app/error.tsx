'use client';

import { useEffect } from 'react';
import { Button, Logo } from '@/components/ui';

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Root error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-brand-black flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <Logo size="md" className="mx-auto mb-8" />
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-500"
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
        <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
        <p className="text-gray-400 mb-8">
          An unexpected error occurred. Please try again or contact support if the problem
          persists.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} variant="primary">
            Try again
          </Button>
          <Button onClick={() => (window.location.href = '/')} variant="outline">
            Go home
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-8 p-4 bg-brand-charcoal rounded-lg text-left text-xs text-red-400 overflow-auto">
            {error.message}
            {error.digest && `\nDigest: ${error.digest}`}
          </pre>
        )}
      </div>
    </div>
  );
}

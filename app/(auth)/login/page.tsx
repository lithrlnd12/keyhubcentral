'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button, Input } from '@/components/ui';
import { PWAInstallPrompt } from '@/components/ui';
import { useAuth } from '@/lib/hooks';

export default function LoginPage() {
  const router = useRouter();
  const { user, signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect when user is authenticated (route by status and role)
  useEffect(() => {
    if (user && !loading) {
      if (user.status === 'pending') {
        router.push('/pending');
      } else if (user.role === 'contractor') {
        router.push('/portal');
      } else if (user.role === 'subscriber') {
        router.push('/subscriber');
      } else if (user.role === 'partner') {
        router.push('/partner');
      } else {
        router.push('/overview');
      }
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setIsSubmitting(true);

    try {
      await signIn(email, password);
      // Don't navigate here - let the useEffect handle it when user state updates
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setLocalError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <div className="bg-brand-charcoal rounded-xl p-6 shadow-xl border border-gray-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">Welcome back</h1>
        <p className="text-gray-400 mt-1">Sign in to your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {(localError || error) && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {localError || error}
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading || isSubmitting}>
          Sign in
        </Button>
      </form>

      <div className="mt-6 text-center space-y-2">
        <Link
          href="/forgot-password"
          className="text-sm text-brand-gold hover:text-brand-gold-light"
        >
          Forgot your password?
        </Link>
        <p className="text-gray-400 text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-brand-gold hover:text-brand-gold-light">
            Sign up
          </Link>
        </p>
      </div>
    </div>
    <PWAInstallPrompt />
    </>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { useAuth } from '@/lib/hooks';

export default function ForgotPasswordPage() {
  const { resetPassword, error } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSent(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send reset email';
      setLocalError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="bg-brand-charcoal rounded-xl p-6 shadow-xl border border-gray-800 text-center">
        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Check your email</h1>

        <p className="text-gray-400 mb-6">
          We&apos;ve sent a password reset link to <strong className="text-white">{email}</strong>.
          Please check your inbox and follow the instructions.
        </p>

        <Link href="/login">
          <Button variant="outline" className="w-full">
            Back to sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-brand-charcoal rounded-xl p-6 shadow-xl border border-gray-800">
      <Link
        href="/login"
        className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </Link>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">Reset your password</h1>
        <p className="text-gray-400 mt-1">
          Enter your email and we&apos;ll send you a reset link
        </p>
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

        {(localError || error) && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
            {localError || error}
          </div>
        )}

        <Button type="submit" className="w-full" loading={loading}>
          Send reset link
        </Button>
      </form>
    </div>
  );
}
